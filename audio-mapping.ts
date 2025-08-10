// Visual-to-audio mapping system with configurable parameters
import { VisualMetrics } from './visual-analysis';

export interface AudioParameters {
  // Base oscillator parameters
  baseFrequency: number; // Hz
  amplitude: number; // 0-1
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  
  // Modulation parameters
  amplitudeModDepth: number; // 0-1
  frequencyModDepth: number; // 0-1
  modRate: number; // Hz
  
  // Filter parameters
  filterCutoff: number; // Hz
  filterResonance: number; // Q factor
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  
  // Stereo parameters
  panPosition: number; // -1 to 1
  stereoWidth: number; // 0-1
  
  // Effects parameters
  distortion: number; // 0-1
  reverb: number; // 0-1
  delay: number; // 0-1
  
  // Noise parameters
  noiseType: 'white' | 'pink' | 'brown';
  noiseDensity: number; // 0-1
  
  // Rhythm parameters
  rhythmicPattern: number; // 0-1
  tempo: number; // BPM
  
  // Additional layers for dominant colors
  colorOscillators: Array<{
    frequency: number;
    amplitude: number;
    waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  }>;
}

export interface MappingConfiguration {
  // Static mappings
  brightnessToFrequency: { min: number; max: number; curve: 'linear' | 'exponential' | 'logarithmic' };
  hueToWaveform: boolean;
  saturationToAmplitudeMod: { min: number; max: number };
  contrastToDistortion: { min: number; max: number };
  exposureToBaseOffset: { min: number; max: number };
  textureToNoiseType: boolean;
  edgesToFilterCutoff: { min: number; max: number };
  symmetryToStereoBalance: boolean;
  dominantColorsToLayers: boolean;
  
  // Dynamic mappings (for video)
  motionSpeedToModRate: { min: number; max: number };
  motionDirectionToPanning: boolean;
  accelerationToPitchGlide: { min: number; max: number };
  rotationToLFO: { min: number; max: number };
  cameraZoomToVolumeAndPitch: boolean;
  cameraPanningToStereoSweep: boolean;
  sceneCutsToPercussion: boolean;
  lightChangeToAmplitudePulse: boolean;
  focusChangeToFilterResonance: { min: number; max: number };
  repetitiveMotionToRhythm: boolean;
  
  // Global settings
  microtonal: boolean;
  layerCount: number;
  globalVolume: number;
}

export const DEFAULT_MAPPING_CONFIG: MappingConfiguration = {
  // Static mappings
  brightnessToFrequency: { min: 200, max: 2000, curve: 'exponential' },
  hueToWaveform: true,
  saturationToAmplitudeMod: { min: 0, max: 0.8 },
  contrastToDistortion: { min: 0, max: 0.6 },
  exposureToBaseOffset: { min: -100, max: 100 },
  textureToNoiseType: true,
  edgesToFilterCutoff: { min: 200, max: 8000 },
  symmetryToStereoBalance: true,
  dominantColorsToLayers: true,
  
  // Dynamic mappings
  motionSpeedToModRate: { min: 0.5, max: 20 },
  motionDirectionToPanning: true,
  accelerationToPitchGlide: { min: 0.1, max: 2 },
  rotationToLFO: { min: 0.1, max: 10 },
  cameraZoomToVolumeAndPitch: true,
  cameraPanningToStereoSweep: true,
  sceneCutsToPercussion: true,
  lightChangeToAmplitudePulse: true,
  focusChangeToFilterResonance: { min: 1, max: 30 },
  repetitiveMotionToRhythm: true,
  
  // Global settings
  microtonal: true,
  layerCount: 5,
  globalVolume: 0.7,
};

export class AudioMapper {
  private config: MappingConfiguration;

  constructor(config: MappingConfiguration = DEFAULT_MAPPING_CONFIG) {
    this.config = config;
  }

  updateConfig(newConfig: Partial<MappingConfiguration>) {
    this.config = { ...this.config, ...newConfig };
  }

  mapVisualToAudio(metrics: VisualMetrics): AudioParameters {
    console.log('Mapping visual metrics to audio parameters:', metrics);
    
    // Map brightness to base frequency
    const baseFrequency = this.mapRange(
      metrics.brightness,
      0, 1,
      this.config.brightnessToFrequency.min,
      this.config.brightnessToFrequency.max,
      this.config.brightnessToFrequency.curve
    );

    // Map hue to waveform
    const waveform = this.config.hueToWaveform ? this.mapHueToWaveform(metrics.hue) : 'sine';

    // Map saturation to amplitude modulation depth
    const amplitudeModDepth = this.mapRange(
      metrics.saturation,
      0, 1,
      this.config.saturationToAmplitudeMod.min,
      this.config.saturationToAmplitudeMod.max
    );

    // Map contrast to distortion
    const distortion = this.mapRange(
      metrics.contrast,
      0, 1,
      this.config.contrastToDistortion.min,
      this.config.contrastToDistortion.max
    );

    // Map exposure to base frequency offset
    const exposureOffset = this.mapRange(
      metrics.exposure,
      0, 1,
      this.config.exposureToBaseOffset.min,
      this.config.exposureToBaseOffset.max
    );

    // Map texture coarseness to noise type and density
    const noiseType = this.config.textureToNoiseType ? this.mapTextureToNoiseType(metrics.textureCoarseness) : 'white';
    const noiseDensity = metrics.textureCoarseness;

    // Map edge density to filter cutoff
    const filterCutoff = this.mapRange(
      metrics.edgeDensity,
      0, 1,
      this.config.edgesToFilterCutoff.min,
      this.config.edgesToFilterCutoff.max
    );

    // Map symmetry to stereo balance
    const panPosition = this.config.symmetryToStereoBalance 
      ? (metrics.symmetry - 0.5) * 0.8  // More symmetric = more centered
      : 0;
    const stereoWidth = metrics.symmetry;

    // Map dominant colors to additional oscillators
    const colorOscillators = this.config.dominantColorsToLayers 
      ? this.mapDominantColorsToOscillators(metrics.dominantColors)
      : [];

    // Dynamic parameters (for video)
    let modRate = 2; // Default
    let frequencyModDepth = 0.1;
    let rhythmicPattern = 0;
    let tempo = 120;
    let filterResonance = 1;
    let additionalPan = 0;
    let additionalAmplitude = 1;

    // Motion speed to modulation rate
    if (metrics.motionSpeed !== undefined) {
      modRate = this.mapRange(
        metrics.motionSpeed,
        0, 1,
        this.config.motionSpeedToModRate.min,
        this.config.motionSpeedToModRate.max
      );
    }

    // Motion direction to panning
    if (metrics.motionDirection !== undefined && this.config.motionDirectionToPanning) {
      additionalPan = Math.sin(metrics.motionDirection * Math.PI / 180) * 0.5;
    }

    // Acceleration to pitch glide (frequency modulation depth)
    if (metrics.acceleration !== undefined) {
      frequencyModDepth = this.mapRange(
        Math.abs(metrics.acceleration),
        0, 1,
        this.config.accelerationToPitchGlide.min,
        this.config.accelerationToPitchGlide.max
      );
    }

    // Camera zoom to volume and pitch scaling
    if (metrics.cameraZoom !== undefined && this.config.cameraZoomToVolumeAndPitch) {
      additionalAmplitude *= metrics.cameraZoom;
      // Zoom also affects frequency (closer = higher pitch)
    }

    // Focus change to filter resonance
    if (metrics.focusChange !== undefined) {
      filterResonance = this.mapRange(
        metrics.focusChange,
        0, 1,
        this.config.focusChangeToFilterResonance.min,
        this.config.focusChangeToFilterResonance.max
      );
    }

    // Repetitive motion to rhythm
    if (metrics.repetitiveMotion !== undefined && this.config.repetitiveMotionToRhythm) {
      rhythmicPattern = metrics.repetitiveMotion;
      tempo = 60 + (metrics.repetitiveMotion * 180); // 60-240 BPM
    }

    return {
      baseFrequency: baseFrequency + exposureOffset,
      amplitude: 0.8 * additionalAmplitude,
      waveform,
      amplitudeModDepth,
      frequencyModDepth,
      modRate,
      filterCutoff,
      filterResonance,
      filterType: 'lowpass',
      panPosition: Math.max(-1, Math.min(1, panPosition + additionalPan)),
      stereoWidth,
      distortion,
      reverb: 0.2,
      delay: 0.1,
      noiseType,
      noiseDensity,
      rhythmicPattern,
      tempo,
      colorOscillators,
    };
  }

  private mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
    curve: 'linear' | 'exponential' | 'logarithmic' = 'linear'
  ): number {
    // Normalize input to 0-1
    const normalized = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
    
    let mapped: number;
    switch (curve) {
      case 'exponential':
        mapped = Math.pow(normalized, 2);
        break;
      case 'logarithmic':
        mapped = Math.log(normalized * 9 + 1) / Math.log(10);
        break;
      default:
        mapped = normalized;
    }

    return outMin + (mapped * (outMax - outMin));
  }

  private mapHueToWaveform(hue: number): 'sine' | 'square' | 'sawtooth' | 'triangle' {
    const normalizedHue = (hue % 360) / 360;
    
    if (normalizedHue < 0.25) return 'sine';
    if (normalizedHue < 0.5) return 'triangle';
    if (normalizedHue < 0.75) return 'sawtooth';
    return 'square';
  }

  private mapTextureToNoiseType(textureCoarseness: number): 'white' | 'pink' | 'brown' {
    if (textureCoarseness < 0.33) return 'white';
    if (textureCoarseness < 0.67) return 'pink';
    return 'brown';
  }

  private mapDominantColorsToOscillators(dominantColors: Array<{ r: number; g: number; b: number; weight: number }>) {
    return dominantColors.slice(0, this.config.layerCount).map(color => {
      // Map color to frequency using a color-to-frequency mapping
      const hue = this.rgbToHue(color.r, color.g, color.b);
      const frequency = 200 + (hue / 360) * 1800; // 200Hz to 2000Hz based on hue
      
      // Use microtonal frequencies if enabled
      const finalFrequency = this.config.microtonal 
        ? frequency * (1 + (Math.random() - 0.5) * 0.1) // ±5% deviation for microtonality
        : this.snapToNearestNote(frequency);

      return {
        frequency: finalFrequency,
        amplitude: color.weight * 0.6, // Scale by color dominance
        waveform: this.mapHueToWaveform(hue) as 'sine' | 'square' | 'sawtooth' | 'triangle',
      };
    });
  }

  private rgbToHue(r: number, g: number, b: number): number {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
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

  private snapToNearestNote(frequency: number): number {
    // Snap to nearest chromatic note (12-tone equal temperament)
    const A4 = 440;
    const noteNumber = 12 * Math.log2(frequency / A4);
    const roundedNote = Math.round(noteNumber);
    return A4 * Math.pow(2, roundedNote / 12);
  }
}
