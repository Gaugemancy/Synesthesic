// Media upload component with drag-and-drop support for all image/video formats
import React, { useCallback, useState } from 'react';
import { DndContext, useDroppable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileVideo, FileImage, X } from 'lucide-react';

export interface MediaFile {
  file: File;
  type: 'image' | 'video';
  url: string;
  duration?: number; // for videos
  width?: number;
  height?: number;
}

interface MediaUploadProps {
  onFileSelect: (media: MediaFile) => void;
  selectedFile: MediaFile | null;
  onClear: () => void;
}

export function MediaUpload({ onFileSelect, selectedFile, onClear }: MediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const { setNodeRef } = useDroppable({
    id: 'media-dropzone',
  });

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      console.error('Unsupported file type. Please upload an image or video file.');
      return;
    }

    const url = URL.createObjectURL(file);
    const mediaFile: MediaFile = {
      file,
      type: isImage ? 'image' : 'video',
      url,
    };

    // Get dimensions and duration
    if (isImage) {
      const img = new Image();
      img.onload = () => {
        mediaFile.width = img.width;
        mediaFile.height = img.height;
        onFileSelect(mediaFile);
      };
      img.src = url;
    } else if (isVideo) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        mediaFile.duration = video.duration;
        mediaFile.width = video.videoWidth;
        mediaFile.height = video.videoHeight;
        onFileSelect(mediaFile);
      };
      video.src = url;
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFileSelect(event.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  }, [handleFileSelect]);

  if (selectedFile) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {selectedFile.type === 'image' ? (
                <FileImage className="h-5 w-5 text-green-600" />
              ) : (
                <FileVideo className="h-5 w-5 text-blue-600" />
              )}
              <span className="font-medium">{selectedFile.file.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              Size: {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
            </div>
            {selectedFile.width && selectedFile.height && (
              <div className="text-sm text-gray-600">
                Dimensions: {selectedFile.width} × {selectedFile.height}
              </div>
            )}
            {selectedFile.duration && (
              <div className="text-sm text-gray-600">
                Duration: {selectedFile.duration.toFixed(1)} seconds
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="mt-4">
            {selectedFile.type === 'image' ? (
              <img 
                src={selectedFile.url} 
                alt="Preview" 
                className="max-w-full max-h-64 object-contain rounded-lg border"
              />
            ) : (
              <video 
                src={selectedFile.url} 
                controls 
                className="max-w-full max-h-64 object-contain rounded-lg border"
                muted
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent 
        ref={setNodeRef}
        className={`p-8 border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center space-y-4">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Upload Media File
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop your image or video file here, or click to browse
            </p>
          </div>
          
          <div className="text-xs text-gray-500">
            Supported formats: All image formats (JPG, PNG, GIF, WebP, etc.) and video formats (MP4, WebM, AVI, MOV, etc.)
          </div>

          <div className="flex justify-center">
            <label className="cursor-pointer">
              <Button type="button" variant="outline">
                Choose File
              </Button>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
