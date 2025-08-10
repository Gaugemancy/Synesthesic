// Audio export component for downloading generated audio as WAV
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, FileAudio, Loader2 } from 'lucide-react';
import { AudioSynthesizer } from '@/lib/audio-synthesis';

interface AudioExportProps {
  synthesizer: AudioSynthesizer | null;
  duration: number;
  isGenerating: boolean;
  onStartExport: () => void;
}

export function AudioExport({ synthesizer, duration, isGenerating, onStartExport }: AudioExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastExportedFile, setLastExportedFile] = useState<{
    name: string;
    size: number;
    url: string;
  } | null>(null);

  const handleExport = async () => {
    if (!synthesizer || isExporting) return;

    try {
      setIsExporting(true);
      setExportProgress(0);

      console.log('Starting audio export...');
      
      // Simulate progress during export
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 2, 95));
      }, 100);

      // Export the audio
      const audioBlob = await synthesizer.exportAudio();
      
      clearInterval(progressInterval);
      setExportProgress(100);

      // Create download
      const url = URL.createObjectURL(audioBlob);
      const fileName = `synesthesique_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Store info about exported file
      setLastExportedFile({
        name: fileName,
        size: audioBlob.size,
        url: url,
      });

      console.log('Audio export completed:', fileName);

    } catch (error) {
      console.error('Failed to export audio:', error);
      alert('Failed to export audio. Please try again.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileAudio className="h-5 w-5" />
          <span>Audio Export</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Duration:</span>
            <p className="text-lg font-mono">{formatDuration(duration)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Format:</span>
            <Badge variant="outline" className="ml-2">WAV 16-bit</Badge>
          </div>
        </div>

        {/* Export Progress */}
        {(isExporting || exportProgress > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Export Progress</span>
              <span className="font-mono">{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}

        {/* Export Button */}
        <div className="flex space-x-2">
          <Button
            onClick={handleExport}
            disabled={!synthesizer || isExporting || isGenerating}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export as WAV
              </>
            )}
          </Button>
        </div>

        {/* Last Export Info */}
        {lastExportedFile && !isExporting && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Successfully exported:
                </p>
                <p className="text-xs text-green-700 font-mono mt-1">
                  {lastExportedFile.name}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Size: {formatFileSize(lastExportedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = lastExportedFile.url;
                  a.download = lastExportedFile.name;
                  a.click();
                }}
                className="text-green-700 hover:text-green-800"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!synthesizer && (
          <p className="text-sm text-gray-500 text-center py-4">
            Upload and analyze media to enable audio export
          </p>
        )}

        {/* Technical Details */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Export format: Uncompressed WAV, 16-bit PCM</p>
          <p>• Sample rate: 44.1 kHz (CD quality)</p>
          <p>• Channels: Stereo</p>
          <p>• Audio contains scientific sonification of visual data</p>
        </div>
      </CardContent>
    </Card>
  );
}
