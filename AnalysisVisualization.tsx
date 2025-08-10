// Real-time visualization component for visual analysis process
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AnalysisResult, VisualMetrics } from '@/lib/visual-analysis';

interface AnalysisVisualizationProps {
  analysisResult: AnalysisResult | null;
  currentTime: number;
  isPlaying: boolean;
}

interface MetricDisplay {
  name: string;
  value: number;
  color: string;
  unit?: string;
  format?: (value: number) => string;
}

export function AnalysisVisualization({ analysisResult, currentTime, isPlaying }: AnalysisVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMetrics, setCurrentMetrics] = useState<VisualMetrics | null>(null);
  
  // Update current metrics based on playback time
  useEffect(() => {
    if (!analysisResult) return;
    
    const currentFrame = analysisResult.timeline.find(frame => {
      const nextFrame = analysisResult.timeline[analysisResult.timeline.indexOf(frame) + 1];
      return frame.time <= currentTime && (!nextFrame || nextFrame.time > currentTime);
    });
    
    setCurrentMetrics(currentFrame?.metrics || analysisResult.averageMetrics);
  }, [analysisResult, currentTime]);

  // Draw timeline visualization
  useEffect(() => {
    if (!analysisResult || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Draw timeline
    drawTimeline(ctx, analysisResult, currentTime, width, height);
    
  }, [analysisResult, currentTime, isPlaying]);

  const drawTimeline = (
    ctx: CanvasRenderingContext2D, 
    result: AnalysisResult, 
    time: number, 
    width: number, 
    height: number
  ) => {
    const { timeline, duration } = result;
    const margin = 40;
    const graphHeight = height - 2 * margin;
    const graphWidth = width - 2 * margin;
    
    // Draw background grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Vertical grid lines (time)
    const timeStep = Math.max(1, Math.floor(duration / 10));
    for (let t = 0; t <= duration; t += timeStep) {
      const x = margin + (t / duration) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, height - margin);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = margin + (i / 4) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }
    
    // Draw metric lines
    const metrics = ['brightness', 'saturation', 'contrast', 'edgeDensity', 'motionSpeed'];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    metrics.forEach((metric, index) => {
      ctx.strokeStyle = colors[index];
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      timeline.forEach((frame, frameIndex) => {
        const x = margin + (frame.time / duration) * graphWidth;
        const value = (frame.metrics as any)[metric] || 0;
        const y = height - margin - (value * graphHeight);
        
        if (frameIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    });
    
    // Draw current time indicator
    if (time >= 0) {
      const currentX = margin + (time / duration) * graphWidth;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(currentX, margin);
      ctx.lineTo(currentX, height - margin);
      ctx.stroke();
    }
    
    // Draw legend
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px sans-serif';
    metrics.forEach((metric, index) => {
      const legendY = 20 + index * 16;
      ctx.fillStyle = colors[index];
      ctx.fillRect(10, legendY - 10, 12, 12);
      ctx.fillStyle = '#1f2937';
      ctx.fillText(metric, 28, legendY);
    });
  };

  if (!analysisResult || !currentMetrics) {
    return (
      <Card className="w-full h-96">
        <CardHeader>
          <CardTitle>Analysis Visualization</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No analysis data available</p>
        </CardContent>
      </Card>
    );
  }

  const staticMetrics: MetricDisplay[] = [
    {
      name: 'Brightness',
      value: currentMetrics.brightness,
      color: 'bg-blue-100 text-blue-800',
      format: (v) => `${Math.round(v * 100)}%`
    },
    {
      name: 'Contrast',
      value: currentMetrics.contrast,
      color: 'bg-amber-100 text-amber-800',
      format: (v) => `${Math.round(v * 100)}%`
    },
    {
      name: 'Saturation',
      value: currentMetrics.saturation,
      color: 'bg-green-100 text-green-800',
      format: (v) => `${Math.round(v * 100)}%`
    },
    {
      name: 'Hue',
      value: currentMetrics.hue,
      color: 'bg-purple-100 text-purple-800',
      format: (v) => `${Math.round(v)}°`
    },
    {
      name: 'Edge Density',
      value: currentMetrics.edgeDensity,
      color: 'bg-red-100 text-red-800',
      format: (v) => `${Math.round(v * 100)}%`
    },
    {
      name: 'Texture',
      value: currentMetrics.textureCoarseness,
      color: 'bg-gray-100 text-gray-800',
      format: (v) => `${Math.round(v * 100)}%`
    },
    {
      name: 'Symmetry',
      value: currentMetrics.symmetry,
      color: 'bg-cyan-100 text-cyan-800',
      format: (v) => `${Math.round(v * 100)}%`
    },
    {
      name: 'Exposure',
      value: currentMetrics.exposure,
      color: 'bg-yellow-100 text-yellow-800',
      format: (v) => `${Math.round(v * 100)}%`
    }
  ];

  const dynamicMetrics: MetricDisplay[] = [
    ...(currentMetrics.motionSpeed !== undefined ? [{
      name: 'Motion Speed',
      value: currentMetrics.motionSpeed,
      color: 'bg-violet-100 text-violet-800',
      format: (v: number) => `${Math.round(v * 100)}%`
    }] : []),
    ...(currentMetrics.motionDirection !== undefined ? [{
      name: 'Motion Direction',
      value: currentMetrics.motionDirection / 360,
      color: 'bg-indigo-100 text-indigo-800',
      format: (v: number) => `${Math.round(v * 360)}°`
    }] : []),
    ...(currentMetrics.acceleration !== undefined ? [{
      name: 'Acceleration',
      value: Math.abs(currentMetrics.acceleration),
      color: 'bg-pink-100 text-pink-800',
      format: (v: number) => `${Math.round(v * 100)}%`
    }] : []),
    ...(currentMetrics.cameraZoom !== undefined ? [{
      name: 'Camera Zoom',
      value: currentMetrics.cameraZoom,
      color: 'bg-teal-100 text-teal-800',
      format: (v: number) => `${Math.round(v * 100)}%`
    }] : []),
    ...(currentMetrics.sceneCuts ? [{
      name: 'Scene Cut',
      value: 1,
      color: 'bg-red-100 text-red-800',
      format: () => 'YES'
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Timeline Visualization */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Analysis Timeline
            {isPlaying && (
              <Badge variant="secondary" className="animate-pulse">
                Playing {Math.round(currentTime)}s / {Math.round(analysisResult.duration)}s
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            className="w-full h-64 border rounded"
            style={{ width: '100%', height: '256px' }}
          />
        </CardContent>
      </Card>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Static Visual Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {staticMetrics.map((metric) => (
                <div key={metric.name} className="space-y-1">
                  <div className="text-sm font-medium text-gray-600">
                    {metric.name}
                  </div>
                  <Badge className={metric.color}>
                    {metric.format ? metric.format(metric.value) : Math.round(metric.value * 100) + '%'}
                  </Badge>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${metric.value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Properties (for video) */}
        {dynamicMetrics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Motion & Camera</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {dynamicMetrics.map((metric) => (
                  <div key={metric.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {metric.name}
                    </span>
                    <Badge className={metric.color}>
                      {metric.format ? metric.format(metric.value) : Math.round(metric.value * 100) + '%'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dominant Colors */}
      {currentMetrics.dominantColors && currentMetrics.dominantColors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dominant Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentMetrics.dominantColors.map((color, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded-lg">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                  />
                  <span className="text-sm text-gray-600">
                    RGB({color.r}, {color.g}, {color.b})
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(color.weight * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
