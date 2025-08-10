// Main Synesthesique application - Visual-to-Sound Scientific Translator
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Square, Volume2, Radio, Upload, Settings } from 'lucide-react';

import { MediaUpload, MediaFile } from '@/components/MediaUpload';
import { AnalysisVisualization } from '@/components/AnalysisVisualization';
import { AudioExport } from '@/components/AudioExport';

import { VisualAnalyzer, AnalysisResult } from '@/lib/visual-analysis';
import { AudioSynthesizer, SynthesizerState } from '@/lib/audio-synthesis';
import { AudioMapper, MappingConfiguration, DEFAULT_MAPPING_CONFIG } from '@/lib/audio-mapping';

type AppState = 'idle' | 'analyzing' | 'generating' | 'ready' | 'playing';

function App() {
  // Core state
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [synthState, setSynthState] = useState<SynthesizerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
  });

  // Services
  const visualAnalyzer = useRef<VisualAnalyzer>(new VisualAnalyzer());
  const audioSynthesizer = useRef<AudioSynthesizer>(new AudioSynthesizer());
  const audioMapper = useRef<AudioMapper>(new AudioMapper());
  
  // Playback control
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context on first user interaction
  const [audioInitialized, setAudioInitialized] = useState(false);

  const initializeAudio = useCallback(async () => {
    if (audioInitialized) return;
    
    try {
      await audioSynthesizer.current.initialize();
      setAudioInitialized(true);
      console.log('Audio system initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      alert('Failed to initialize audio system. Please check your browser settings.');
    }
  }, [audioInitialized]);

  // File upload handler
  const handleFileSelect = useCallback(async (media: MediaFile) => {
    console.log('File selected:', media.file.name);
    setSelectedFile(media);
    setAnalysisResult(null);
    setAppState('idle');
    
    // Initialize audio on first interaction
    await initializeAudio();
  }, [initializeAudio]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setAppState('idle');
    setAnalysisProgress(0);
    setGenerationProgress(0);
    
    // Stop any playing audio
    if (synthState.isPlaying) {
      audioSynthesizer.current.stop();
    }
  }, [synthState.isPlaying]);

  // Analysis process
  const handleStartAnalysis = useCallback(async () => {
    if (!selectedFile) return;

    console.log('Starting analysis for:', selectedFile.file.name);
    setAppState('analyzing');
    setAnalysisProgress(0);

    try {
      const result = await visualAnalyzer.current.analyzeMedia(
        selectedFile,
        (progress) => setAnalysisProgress(progress * 100)
      );

      console.log('Analysis completed:', result);
      setAnalysisResult(result);
      setAppState('generating');
      setGenerationProgress(0);

      // Generate audio
      await audioSynthesizer.current.generateAudio(
        result,
        (progress) => setGenerationProgress(progress * 100)
      );

      setAppState('ready');
      console.log('Audio generation completed');

    } catch (error) {
      console.error('Analysis failed:', error);
      setAppState('idle');
      alert('Analysis failed. Please try again with a different file.');
    }
  }, [selectedFile]);

  // Playback controls
  const handlePlay = useCallback(async () => {
    if (!analysisResult || appState !== 'ready') return;
    
    try {
      await audioSynthesizer.current.play();
      setAppState('playing');
      
      // Start playback time tracking
      const startTime = Date.now();
      playbackInterval.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= analysisResult.duration) {
          handleStop();
        } else {
          setSynthState(prev => ({ ...prev, currentTime: elapsed, isPlaying: true }));
        }
      }, 100);
      
    } catch (error) {
      console.error('Playback failed:', error);
      alert('Playback failed. Please try regenerating the audio.');
    }
  }, [analysisResult, appState]);

  const handlePause = useCallback(() => {
    audioSynthesizer.current.stop();
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
    setAppState('ready');
    setSynthState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handleStop = useCallback(() => {
    audioSynthesizer.current.stop();
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
    setAppState('ready');
    setSynthState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    audioSynthesizer.current.setVolume(volume);
    setSynthState(prev => ({ ...prev, volume }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioSynthesizer.current.cleanup();
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, []);

  // Update synth state from analysis result
  useEffect(() => {
    if (analysisResult) {
      setSynthState(prev => ({
        ...prev,
        duration: analysisResult.duration,
      }));
    }
  }, [analysisResult]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center space-x-3">
              <Radio className="h-8 w-8" />
              <span>Synesthésique</span>
              <Badge variant="secondary" className="text-blue-900 bg-white/20">
                v1.0
              </Badge>
            </CardTitle>
            <p className="text-blue-100 text-lg">
              Visual-to-Sound Scientific Translator • Convert images and videos into scientific sonification
            </p>
          </CardHeader>
        </Card>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload and Controls */}
          <div className="space-y-6">
            {/* File Upload */}
            <MediaUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClear={handleClearFile}
            />

            {/* Analysis Controls */}
            {selectedFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Analysis & Generation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appState === 'idle' && (
                    <Button onClick={handleStartAnalysis} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Start Analysis
                    </Button>
                  )}

                  {appState === 'analyzing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Analyzing visual data...</span>
                        <span>{Math.round(analysisProgress)}%</span>
                      </div>
                      <Progress value={analysisProgress} />
                    </div>
                  )}

                  {appState === 'generating' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Generating audio...</span>
                        <span>{Math.round(generationProgress)}%</span>
                      </div>
                      <Progress value={generationProgress} />
                    </div>
                  )}

                  {(appState === 'ready' || appState === 'playing') && (
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        {!synthState.isPlaying ? (
                          <Button onClick={handlePlay} className="flex-1">
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </Button>
                        ) : (
                          <Button onClick={handlePause} className="flex-1" variant="secondary">
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        )}
                        <Button onClick={handleStop} variant="outline">
                          <Square className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Volume Control */}
                      <div className="flex items-center space-x-2">
                        <Volume2 className="h-4 w-4" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={synthState.volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm w-8">{Math.round(synthState.volume * 100)}</span>
                      </div>

                      {/* Playback Info */}
                      <div className="text-sm text-gray-600 text-center">
                        {Math.round(synthState.currentTime)}s / {Math.round(synthState.duration)}s
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Export */}
            {(appState === 'ready' || appState === 'playing') && (
              <AudioExport
                synthesizer={audioSynthesizer.current}
                duration={synthState.duration}
                isGenerating={appState !== 'ready' && appState !== 'playing'}
                onStartExport={() => {}}
              />
            )}
          </div>

          {/* Right Columns - Visualization and Analysis */}
          <div className="lg:col-span-2">
            {analysisResult ? (
              <Tabs defaultValue="visualization" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="visualization">Real-time Analysis</TabsTrigger>
                  <TabsTrigger value="technical">Technical Details</TabsTrigger>
                </TabsList>

                <TabsContent value="visualization" className="space-y-6">
                  <AnalysisVisualization
                    analysisResult={analysisResult}
                    currentTime={synthState.currentTime}
                    isPlaying={synthState.isPlaying}
                  />
                </TabsContent>

                <TabsContent value="technical" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Visual-to-Audio Mapping</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Visual Properties → Audio Parameters</h4>
                            <ul className="space-y-1 text-gray-600">
                              <li>• Brightness → Frequency (200-2000 Hz)</li>
                              <li>• Color Hue → Oscillator waveform</li>
                              <li>• Saturation → Amplitude modulation</li>
                              <li>• Contrast → Harmonic distortion</li>
                              <li>• Exposure → Base frequency offset</li>
                              <li>• Texture → Noise type & density</li>
                              <li>• Edges → Filter cutoff position</li>
                              <li>• Symmetry → Stereo balance</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Motion → Dynamic Audio</h4>
                            <ul className="space-y-1 text-gray-600">
                              <li>• Motion Speed → Modulation rate</li>
                              <li>• Motion Direction → Stereo panning</li>
                              <li>• Acceleration → Pitch glide rate</li>
                              <li>• Rotation → LFO depth & rate</li>
                              <li>• Camera Zoom → Volume & pitch</li>
                              <li>• Camera Pan → Stereo sweep</li>
                              <li>• Scene Cuts → Percussive hits</li>
                              <li>• Light Change → Amplitude pulse</li>
                            </ul>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Technical Specifications</h4>
                          <ul className="space-y-1 text-gray-600">
                            <li>• Multi-layered synthesis with up to 5 oscillators</li>
                            <li>• Microtonal frequency mapping (non-12-tone)</li>
                            <li>• Real-time parameter modulation</li>
                            <li>• Stereo spatial positioning</li>
                            <li>• Scientific objectivity maintained</li>
                            <li>• Preserves temporal video characteristics</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <Radio className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Ready for Analysis
                  </h3>
                  <p className="text-gray-500">
                    Upload an image or video to begin visual-to-audio translation
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <Card className="bg-gray-800 text-gray-300">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm">
              <p>
                Synesthésique transforms visual data into scientific audio representations
              </p>
              <div className="flex space-x-4 mt-2 md:mt-0">
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  Web Audio API
                </Badge>
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  Computer Vision
                </Badge>
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  Audio Synthesis
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
