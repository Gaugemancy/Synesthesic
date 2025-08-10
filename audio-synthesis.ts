// Audio synthesis engine using Tone.js for multi-layered sound generation
import * as Tone from 'tone';
import { AudioParameters } from './audio-mapping';
import { AnalysisResult } from './visual-analysis';

export interface SynthesizerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export class AudioSynthesizer {
  private mainOscillator: Tone.Oscillator | null = null;
  private colorOscillators: Tone.Oscillator[] = [];
  private noiseSource: Tone.Noise | null = null;
  private filter: Tone.Filter | null = null;
  private distortion: Tone.Distortion | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private panner: Tone.Panner | null = null;
  private masterGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  private ampLfo: Tone.LFO | null = null;
  
  private currentAnalysisResult: AnalysisResult | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private playStartTime = 0;
  private scheduledEvents: Tone.ToneEvent[] = [];

  constructor() {
    console.log('AudioSynthesizer initialized');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Tone.start();
      console.log('Tone.js audio context started');
      
      // Create master gain for volume control
      this.masterGain = new Tone.Gain(0.7).toDestination();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio synthesizer:', error);
      throw error;
    }
  }

  async generateAudio(analysisResult: AnalysisResult, onProgress?: (progress: number) => void): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('Generating audio for analysis result:', analysisResult);
    
    this.currentAnalysisResult = analysisResult;
    this.cleanup();
    
    // Schedule audio events for each timeline point
    this.scheduleTimelineEvents(analysisResult, onProgress);
  }

  private scheduleTimelineEvents(analysisResult: AnalysisResult, onProgress?: (progress: number) => void) {
    const { timeline, duration } = analysisResult;
    
    timeline.forEach((frame, index) => {
      const nextFrame = timeline[index + 1];
      const frameDuration = nextFrame ? nextFrame.time - frame.time : 0.1;
      
      // Schedule parameter changes for this frame
      const event = new Tone.ToneEvent((time) => {
        this.updateSynthParameters(frame.time, frameDuration);
        onProgress?.((frame.time / duration));
      }, {});
      
      event.start(frame.time);
      this.scheduledEvents.push(event);
    });

    console.log(`Scheduled ${timeline.length} audio events`);
  }

  private updateSynthParameters(time: number, duration: number) {
    if (!this.currentAnalysisResult) return;

    // Find the current frame metrics
    const frame = this.currentAnalysisResult.timeline.find(f => Math.abs(f.time - time) < 0.1);
    if (!frame) return;

    console.log(`Updating synth parameters at time ${time}:`, frame.metrics);

    // Map visual metrics to audio parameters
    const audioParams = this.mapMetricsToAudio(frame.metrics);
    
    // Update or create oscillators and effects
    this.updateMainOscillator(audioParams, time);
    this.updateColorOscillators(audioParams, time);
    this.updateEffects(audioParams, time);
    this.updateModulation(audioParams, time);
    
    // Handle special events
    if (frame.metrics.sceneCuts) {
      this.triggerPercussiveHit(time);
    }
  }

  private mapMetricsToAudio(metrics: any): AudioParameters {
    // This should use the AudioMapper, but for now we'll do basic mapping
    return {
      baseFrequency: 200 + (metrics.brightness * 1800),
      amplitude: 0.6,
      waveform: this.hueToWaveform(metrics.hue),
      amplitudeModDepth: metrics.saturation * 0.8,
      frequencyModDepth: 0.1,
      modRate: metrics.motionSpeed ? 1 + metrics.motionSpeed * 10 : 2,
      filterCutoff: 500 + (metrics.edgeDensity * 7500),
      filterResonance: 1 + (metrics.focusChange || 0) * 10,
      filterType: 'lowpass',
      panPosition: (metrics.symmetry - 0.5) * 1.6,
      stereoWidth: metrics.symmetry,
      distortion: metrics.contrast * 0.6,
      reverb: 0.3,
      delay: 0.15,
      noiseType: this.textureToNoiseType(metrics.textureCoarseness),
      noiseDensity: metrics.textureCoarseness,
      rhythmicPattern: metrics.repetitiveMotion || 0,
      tempo: 120,
      colorOscillators: metrics.dominantColors?.slice(0, 3).map((color: any) => ({
        frequency: 300 + (this.rgbToHue(color.r, color.g, color.b) / 360) * 1400,
        amplitude: color.weight * 0.4,
        waveform: 'sine' as const,
      })) || [],
    };
  }

  private updateMainOscillator(params: AudioParameters, time: number) {
    if (!this.masterGain) return;

    // Create or update main oscillator
    if (!this.mainOscillator) {
      this.mainOscillator = new Tone.Oscillator();
      
      // Create and connect effects chain
      this.setupEffectsChain();
      
      // Connect main oscillator through effects
      this.mainOscillator
        .chain(this.filter!, this.distortion!, this.delay!, this.reverb!, this.panner!, this.masterGain);
      
      this.mainOscillator.start(time);
    }

    // Update oscillator parameters
    this.mainOscillator.frequency.setValueAtTime(params.baseFrequency, time);
    this.mainOscillator.type = params.waveform;

    // Update effects parameters
    if (this.filter) {
      this.filter.frequency.setValueAtTime(params.filterCutoff, time);
      this.filter.Q.setValueAtTime(params.filterResonance, time);
    }

    if (this.distortion) {
      this.distortion.distortion = params.distortion;
    }

    if (this.panner) {
      this.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.panPosition)), time);
    }

    if (this.reverb) {
      this.reverb.wet.setValueAtTime(params.reverb, time);
    }

    if (this.delay) {
      this.delay.wet.setValueAtTime(params.delay, time);
    }
  }

  private updateColorOscillators(params: AudioParameters, time: number) {
    if (!this.masterGain) return;

    // Clean up existing color oscillators
    this.colorOscillators.forEach(osc => {
      if (osc.state === 'started') {
        osc.stop(time);
      }
      osc.dispose();
    });
    this.colorOscillators = [];

    // Create new color oscillators
    params.colorOscillators.forEach((colorOsc, index) => {
      if (colorOsc.amplitude > 0.05) { // Only create if amplitude is significant
        const osc = new Tone.Oscillator();
        osc.frequency.setValueAtTime(colorOsc.frequency, time);
        osc.type = colorOsc.waveform;
        
        // Create individual gain for this oscillator
        const gain = new Tone.Gain(colorOsc.amplitude * 0.3);
        
        // Connect with some stereo spread
        const colorPanner = new Tone.Panner((index - 1) * 0.4);
        
        osc.chain(gain, colorPanner, this.masterGain);
        osc.start(time);
        
        this.colorOscillators.push(osc);
      }
    });
  }

  private updateEffects(params: AudioParameters, time: number) {
    // Update noise source
    if (params.noiseDensity > 0.1) {
      if (!this.noiseSource) {
        this.noiseSource = new Tone.Noise(params.noiseType);
        const noiseGain = new Tone.Gain(params.noiseDensity * 0.2);
        this.noiseSource.chain(noiseGain, this.masterGain!);
        this.noiseSource.start(time);
      } else {
        this.noiseSource.type = params.noiseType;
      }
    }
  }

  private updateModulation(params: AudioParameters, time: number) {
    // Update LFOs for modulation
    if (params.amplitudeModDepth > 0.1 && this.mainOscillator) {
      if (!this.ampLfo) {
        this.ampLfo = new Tone.LFO(params.modRate, 0, params.amplitudeModDepth);
        this.ampLfo.connect(this.mainOscillator.volume);
        this.ampLfo.start(time);
      } else {
        this.ampLfo.frequency.setValueAtTime(params.modRate, time);
        this.ampLfo.max = params.amplitudeModDepth;
      }
    }

    if (params.frequencyModDepth > 0.05 && this.mainOscillator) {
      if (!this.lfo) {
        this.lfo = new Tone.LFO(params.modRate * 0.5, 0, params.frequencyModDepth * 100);
        this.lfo.connect(this.mainOscillator.frequency);
        this.lfo.start(time);
      } else {
        this.lfo.frequency.setValueAtTime(params.modRate * 0.5, time);
        this.lfo.max = params.frequencyModDepth * 100;
      }
    }
  }

  private setupEffectsChain() {
    this.filter = new Tone.Filter(1000, 'lowpass');
    this.distortion = new Tone.Distortion(0.2);
    this.delay = new Tone.FeedbackDelay('8n', 0.1);
    this.reverb = new Tone.Reverb(2);
    this.panner = new Tone.Panner(0);
  }

  private triggerPercussiveHit(time: number) {
    // Create a short percussive sound for scene cuts
    const perc = new Tone.Oscillator(80, 'triangle');
    const percGain = new Tone.Gain(0.3);
    const percEnv = new Tone.Envelope({
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    });
    
    perc.chain(percGain, this.masterGain!);
    percEnv.connect(percGain.gain);
    
    perc.start(time);
    percEnv.triggerAttackRelease(0.1, time);
    
    // Cleanup after the hit
    setTimeout(() => {
      perc.stop();
      perc.dispose();
      percGain.dispose();
      percEnv.dispose();
    }, 200);
  }

  async play(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.currentAnalysisResult || this.isPlaying) return;

    console.log('Starting audio playback');
    this.isPlaying = true;
    this.playStartTime = Tone.now();
    
    // Start the transport to trigger scheduled events
    Tone.getTransport().start();
  }

  stop(): void {
    console.log('Stopping audio playback');
    this.isPlaying = false;
    
    // Stop transport and clear scheduled events
    Tone.getTransport().stop();
    
    // Stop all oscillators
    if (this.mainOscillator && this.mainOscillator.state === 'started') {
      this.mainOscillator.stop();
    }
    
    this.colorOscillators.forEach(osc => {
      if (osc.state === 'started') {
        osc.stop();
      }
    });
    
    if (this.noiseSource && this.noiseSource.state === 'started') {
      this.noiseSource.stop();
    }
  }

  async exportAudio(): Promise<Blob> {
    if (!this.currentAnalysisResult) {
      throw new Error('No audio to export');
    }

    console.log('Exporting audio...');
    
    // Create offline context for rendering
    const duration = this.currentAnalysisResult.duration;
    const offline = Tone.Offline(() => {
      // Recreate the audio synthesis in offline context
      this.generateAudio(this.currentAnalysisResult!);
      this.play();
    }, duration);

    const buffer = await offline;
    const audioBuffer = buffer.toArray ? await buffer.toArray() : [buffer.getChannelData(0), buffer.getChannelData(1)];
    
    // Convert to WAV format
    const wavBuffer = this.encodeWAV(audioBuffer as Float32Array[], Tone.getContext().sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private encodeWAV(buffer: Float32Array[], sampleRate: number): ArrayBuffer {
    const length = buffer[0].length;
    const channels = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer[channel][i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  getState(): SynthesizerState {
    const currentTime = this.isPlaying 
      ? Tone.now() - this.playStartTime
      : 0;
    
    return {
      isPlaying: this.isPlaying,
      currentTime,
      duration: this.currentAnalysisResult?.duration || 0,
      volume: this.masterGain?.gain.value || 0.7,
    };
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), Tone.now());
    }
  }

  cleanup(): void {
    console.log('Cleaning up audio synthesizer');
    
    this.stop();
    
    // Dispose of all Tone.js objects
    this.scheduledEvents.forEach(event => event.dispose());
    this.scheduledEvents = [];
    
    if (this.mainOscillator) {
      this.mainOscillator.dispose();
      this.mainOscillator = null;
    }
    
    this.colorOscillators.forEach(osc => osc.dispose());
    this.colorOscillators = [];
    
    if (this.noiseSource) {
      this.noiseSource.dispose();
      this.noiseSource = null;
    }
    
    [this.filter, this.distortion, this.reverb, this.delay, this.panner, this.lfo, this.ampLfo].forEach(node => {
      if (node) {
        node.dispose();
      }
    });
    
    this.filter = null;
    this.distortion = null;
    this.reverb = null;
    this.delay = null;
    this.panner = null;
    this.lfo = null;
    this.ampLfo = null;
  }

  // Helper methods
  private hueToWaveform(hue: number): 'sine' | 'square' | 'sawtooth' | 'triangle' {
    const normalizedHue = (hue % 360) / 360;
    if (normalizedHue < 0.25) return 'sine';
    if (normalizedHue < 0.5) return 'triangle';
    if (normalizedHue < 0.75) return 'sawtooth';
    return 'square';
  }

  private textureToNoiseType(texture: number): 'white' | 'pink' | 'brown' {
    if (texture < 0.33) return 'white';
    if (texture < 0.67) return 'pink';
    return 'brown';
  }

  private rgbToHue(r: number, g: number, b: number): number {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const diff = max - min;
    if (diff === 0) return 0;
    let hue = 0;
    switch (max) {
      case r: hue = (g - b) / diff + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / diff + 2; break;
      case b: hue = (r - g) / diff + 4; break;
    }
    return (hue / 6) * 360;
  }
}
