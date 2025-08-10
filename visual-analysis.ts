// Visual analysis engine for extracting visual properties from images and videos
import { MediaFile } from '@/components/MediaUpload';

export interface VisualMetrics {
  // Static properties (for images and video frames)
  brightness: number; // 0-1
  contrast: number; // 0-1
  saturation: number; // 0-1
  hue: number; // 0-360
  exposure: number; // 0-1
  textureCoarseness: number; // 0-1
  edgeDensity: number; // 0-1
  symmetry: number; // 0-1
  dominantColors: Array<{ r: number; g: number; b: number; weight: number }>;
  
  // Dynamic properties (for video only)
  motionSpeed?: number; // 0-1
  motionDirection?: number; // 0-360 degrees
  acceleration?: number; // -1 to 1
  rotation?: number; // -1 to 1
  cameraZoom?: number; // 0-1
  cameraPanning?: number; // -1 to 1
  sceneCuts?: boolean;
  lightChange?: number; // -1 to 1
  focusChange?: number; // 0-1
  repetitiveMotion?: number; // 0-1
}

export interface AnalysisResult {
  timeline: Array<{
    time: number; // seconds
    metrics: VisualMetrics;
  }>;
  averageMetrics: VisualMetrics;
  duration: number; // seconds
}

export class VisualAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async analyzeMedia(media: MediaFile, onProgress?: (progress: number) => void): Promise<AnalysisResult> {
    console.log('Starting visual analysis for:', media.file.name);
    
    if (media.type === 'image') {
      return this.analyzeImage(media, onProgress);
    } else {
      return this.analyzeVideo(media, onProgress);
    }
  }

  private async analyzeImage(media: MediaFile, onProgress?: (progress: number) => void): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        onProgress?.(0.5);
        
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        
        const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        const metrics = this.analyzeImageData(imageData);
        
        onProgress?.(1);
        
        resolve({
          timeline: [{ time: 0, metrics }],
          averageMetrics: metrics,
          duration: 5, // Default 5 seconds for images
        });
      };
      img.src = media.url;
    });
  }

  private async analyzeVideo(media: MediaFile, onProgress?: (progress: number) => void): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const frameRate = 1; // Analyze 1 frame per second
        const frameCount = Math.floor(duration * frameRate);
        const timeline: Array<{ time: number; metrics: VisualMetrics }> = [];
        
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        
        let currentFrame = 0;
        let previousImageData: ImageData | null = null;
        
        const processFrame = () => {
          const time = currentFrame / frameRate;
          video.currentTime = time;
          
          video.onseeked = () => {
            this.ctx.drawImage(video, 0, 0);
            const imageData = this.ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);
            
            const staticMetrics = this.analyzeImageData(imageData);
            const dynamicMetrics = previousImageData 
              ? this.analyzeDynamicMetrics(previousImageData, imageData, time)
              : this.getDefaultDynamicMetrics();
            
            const metrics: VisualMetrics = { ...staticMetrics, ...dynamicMetrics };
            timeline.push({ time, metrics });
            
            previousImageData = imageData;
            currentFrame++;
            
            onProgress?.(currentFrame / frameCount);
            
            if (currentFrame < frameCount) {
              processFrame();
            } else {
              const averageMetrics = this.calculateAverageMetrics(timeline);
              resolve({
                timeline,
                averageMetrics,
                duration,
              });
            }
          };
        };
        
        processFrame();
      };
      
      video.src = media.url;
    });
  }

  private analyzeImageData(imageData: ImageData): VisualMetrics {
    const { data, width, height } = imageData;
    const pixelCount = width * height;
    
    let totalBrightness = 0;
    let totalSaturation = 0;
    let totalHue = 0;
    let minLuminance = 255;
    let maxLuminance = 0;
    
    const colorCounts: { [key: string]: number } = {};
    const edges: number[] = [];
    
    // Analyze each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (luminance)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += luminance;
      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);
      
      // Calculate HSV
      const hsv = this.rgbToHsv(r, g, b);
      totalSaturation += hsv.s;
      totalHue += hsv.h;
      
      // Count dominant colors (simplified)
      const colorKey = `${Math.floor(r / 32)},${Math.floor(g / 32)},${Math.floor(b / 32)}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    // Calculate edge density using Sobel operator (simplified)
    const edgeDensity = this.calculateEdgeDensity(imageData);
    
    // Calculate texture coarseness (simplified using local variance)
    const textureCoarseness = this.calculateTextureCoarseness(imageData);
    
    // Calculate symmetry (horizontal and vertical)
    const symmetry = this.calculateSymmetry(imageData);
    
    // Extract dominant colors
    const dominantColors = this.extractDominantColors(colorCounts, pixelCount);
    
    return {
      brightness: totalBrightness / pixelCount / 255,
      contrast: (maxLuminance - minLuminance) / 255,
      saturation: totalSaturation / pixelCount,
      hue: (totalHue / pixelCount) * 360,
      exposure: this.calculateExposure(totalBrightness / pixelCount / 255),
      textureCoarseness,
      edgeDensity,
      symmetry,
      dominantColors,
    };
  }

  private analyzeDynamicMetrics(prevImageData: ImageData, currentImageData: ImageData, time: number) {
    const motionData = this.calculateOpticalFlow(prevImageData, currentImageData);
    
    return {
      motionSpeed: motionData.speed,
      motionDirection: motionData.direction,
      acceleration: motionData.acceleration,
      rotation: motionData.rotation,
      cameraZoom: motionData.zoom,
      cameraPanning: motionData.panning,
      sceneCuts: motionData.sceneCut,
      lightChange: motionData.lightChange,
      focusChange: motionData.focusChange,
      repetitiveMotion: motionData.repetitiveMotion,
    };
  }

  private getDefaultDynamicMetrics() {
    return {
      motionSpeed: 0,
      motionDirection: 0,
      acceleration: 0,
      rotation: 0,
      cameraZoom: 0.5,
      cameraPanning: 0,
      sceneCuts: false,
      lightChange: 0,
      focusChange: 0,
      repetitiveMotion: 0,
    };
  }

  private calculateOpticalFlow(prevImageData: ImageData, currentImageData: ImageData) {
    // Simplified optical flow calculation
    const prev = prevImageData.data;
    const curr = currentImageData.data;
    
    let totalMotion = 0;
    let horizontalMotion = 0;
    let verticalMotion = 0;
    let lightDiff = 0;
    
    const sampleStep = 16; // Sample every 16th pixel for performance
    
    for (let i = 0; i < prev.length; i += 4 * sampleStep) {
      const prevLuminance = 0.299 * prev[i] + 0.587 * prev[i + 1] + 0.114 * prev[i + 2];
      const currLuminance = 0.299 * curr[i] + 0.587 * curr[i + 1] + 0.114 * curr[i + 2];
      
      const diff = Math.abs(currLuminance - prevLuminance);
      totalMotion += diff;
      lightDiff += currLuminance - prevLuminance;
      
      // Calculate directional motion (simplified)
      const pixelIndex = i / 4;
      const width = currentImageData.width;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      
      if (x > 0 && x < width - 1 && y > 0 && y < currentImageData.height - 1) {
        const leftDiff = Math.abs(curr[i] - curr[i - 4]);
        const rightDiff = Math.abs(curr[i] - curr[i + 4]);
        horizontalMotion += rightDiff - leftDiff;
        
        const topDiff = Math.abs(curr[i] - curr[i - width * 4]);
        const bottomDiff = Math.abs(curr[i] - curr[i + width * 4]);
        verticalMotion += bottomDiff - topDiff;
      }
    }
    
    const sampleCount = prev.length / (4 * sampleStep);
    
    return {
      speed: Math.min(totalMotion / sampleCount / 255, 1),
      direction: Math.atan2(verticalMotion, horizontalMotion) * 180 / Math.PI,
      acceleration: 0, // Would need temporal analysis
      rotation: 0, // Would need more complex analysis
      zoom: 0.5, // Would need feature tracking
      panning: horizontalMotion / sampleCount / 255,
      sceneCut: totalMotion / sampleCount > 128, // Threshold for scene cut
      lightChange: lightDiff / sampleCount / 255,
      focusChange: 0, // Would need edge sharpness analysis
      repetitiveMotion: 0, // Would need temporal pattern analysis
    };
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
      switch (max) {
        case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }

    return { h, s, v };
  }

  private calculateEdgeDensity(imageData: ImageData): number {
    const { data, width, height } = imageData;
    let edgeCount = 0;
    
    // Simplified Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        const gx = 
          -data[idx - width * 4 - 4] - 2 * data[idx - 4] - data[idx + width * 4 - 4] +
          data[idx - width * 4 + 4] + 2 * data[idx + 4] + data[idx + width * 4 + 4];
        
        const gy = 
          -data[idx - width * 4 - 4] - 2 * data[idx - width * 4] - data[idx - width * 4 + 4] +
          data[idx + width * 4 - 4] + 2 * data[idx + width * 4] + data[idx + width * 4 + 4];
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 100) edgeCount++;
      }
    }
    
    return Math.min(edgeCount / (width * height), 1);
  }

  private calculateTextureCoarseness(imageData: ImageData): number {
    const { data, width, height } = imageData;
    let variance = 0;
    const sampleSize = 5;
    
    for (let y = sampleSize; y < height - sampleSize; y += sampleSize) {
      for (let x = sampleSize; x < width - sampleSize; x += sampleSize) {
        let localSum = 0;
        let localSumSq = 0;
        let count = 0;
        
        for (let dy = -sampleSize; dy <= sampleSize; dy++) {
          for (let dx = -sampleSize; dx <= sampleSize; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            localSum += luminance;
            localSumSq += luminance * luminance;
            count++;
          }
        }
        
        const mean = localSum / count;
        const localVariance = (localSumSq / count) - (mean * mean);
        variance += localVariance;
      }
    }
    
    return Math.min(variance / (width * height) / 1000, 1);
  }

  private calculateSymmetry(imageData: ImageData): number {
    const { data, width, height } = imageData;
    let symmetryScore = 0;
    const sampleStep = 4;
    
    // Check horizontal symmetry
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width / 2; x += sampleStep) {
        const leftIdx = (y * width + x) * 4;
        const rightIdx = (y * width + (width - 1 - x)) * 4;
        
        const leftLuminance = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
        const rightLuminance = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
        
        symmetryScore += 1 - Math.abs(leftLuminance - rightLuminance) / 255;
      }
    }
    
    return symmetryScore / ((width / 2 / sampleStep) * (height / sampleStep));
  }

  private calculateExposure(brightness: number): number {
    // Simplified exposure calculation based on brightness distribution
    return Math.min(Math.max(brightness * 1.2 - 0.1, 0), 1);
  }

  private extractDominantColors(colorCounts: { [key: string]: number }, totalPixels: number) {
    const colors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(n => parseInt(n) * 32);
        return { r, g, b, weight: count / totalPixels };
      });
    
    return colors;
  }

  private calculateAverageMetrics(timeline: Array<{ time: number; metrics: VisualMetrics }>): VisualMetrics {
    if (timeline.length === 0) {
      throw new Error('No timeline data to average');
    }

    if (timeline.length === 1) {
      return timeline[0].metrics;
    }

    const count = timeline.length;
    const firstMetrics = timeline[0].metrics;
    
    // Start with first frame as base
    const averageMetrics: VisualMetrics = { ...firstMetrics };
    
    // Sum up all numeric values
    let brightness = 0, contrast = 0, saturation = 0, hue = 0;
    let exposure = 0, textureCoarseness = 0, edgeDensity = 0, symmetry = 0;
    let motionSpeed = 0, motionDirection = 0, acceleration = 0, rotation = 0;
    let cameraZoom = 0, cameraPanning = 0, lightChange = 0, focusChange = 0, repetitiveMotion = 0;
    let sceneCutCount = 0;
    
    timeline.forEach(({ metrics }) => {
      brightness += metrics.brightness;
      contrast += metrics.contrast;
      saturation += metrics.saturation;
      hue += metrics.hue;
      exposure += metrics.exposure;
      textureCoarseness += metrics.textureCoarseness;
      edgeDensity += metrics.edgeDensity;
      symmetry += metrics.symmetry;
      
      if (metrics.motionSpeed !== undefined) motionSpeed += metrics.motionSpeed;
      if (metrics.motionDirection !== undefined) motionDirection += metrics.motionDirection;
      if (metrics.acceleration !== undefined) acceleration += metrics.acceleration;
      if (metrics.rotation !== undefined) rotation += metrics.rotation;
      if (metrics.cameraZoom !== undefined) cameraZoom += metrics.cameraZoom;
      if (metrics.cameraPanning !== undefined) cameraPanning += metrics.cameraPanning;
      if (metrics.lightChange !== undefined) lightChange += metrics.lightChange;
      if (metrics.focusChange !== undefined) focusChange += metrics.focusChange;
      if (metrics.repetitiveMotion !== undefined) repetitiveMotion += metrics.repetitiveMotion;
      if (metrics.sceneCuts) sceneCutCount++;
    });
    
    // Calculate averages
    averageMetrics.brightness = brightness / count;
    averageMetrics.contrast = contrast / count;
    averageMetrics.saturation = saturation / count;
    averageMetrics.hue = hue / count;
    averageMetrics.exposure = exposure / count;
    averageMetrics.textureCoarseness = textureCoarseness / count;
    averageMetrics.edgeDensity = edgeDensity / count;
    averageMetrics.symmetry = symmetry / count;
    
    // Average dynamic properties if they exist
    if (firstMetrics.motionSpeed !== undefined) averageMetrics.motionSpeed = motionSpeed / count;
    if (firstMetrics.motionDirection !== undefined) averageMetrics.motionDirection = motionDirection / count;
    if (firstMetrics.acceleration !== undefined) averageMetrics.acceleration = acceleration / count;
    if (firstMetrics.rotation !== undefined) averageMetrics.rotation = rotation / count;
    if (firstMetrics.cameraZoom !== undefined) averageMetrics.cameraZoom = cameraZoom / count;
    if (firstMetrics.cameraPanning !== undefined) averageMetrics.cameraPanning = cameraPanning / count;
    if (firstMetrics.lightChange !== undefined) averageMetrics.lightChange = lightChange / count;
    if (firstMetrics.focusChange !== undefined) averageMetrics.focusChange = focusChange / count;
    if (firstMetrics.repetitiveMotion !== undefined) averageMetrics.repetitiveMotion = repetitiveMotion / count;
    averageMetrics.sceneCuts = sceneCutCount > count / 2; // More than half have scene cuts
    
    return averageMetrics;
  }
}
