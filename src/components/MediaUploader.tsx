"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MediaUploader = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleProcess = () => {
    if (selectedFile) {
      // In a real application, this is where you'd send the file
      // to a backend for analysis or process it with a client-side audio library.
      console.log("Processing file:", selectedFile.name, selectedFile.type);
      // You would then pass this file to a sonification logic component
      // For now, we'll just log it.
    } else {
      console.log("No file selected.");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upload Media</CardTitle>
        <CardDescription>Upload an image or video to begin sonification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="media">Image or Video File</Label>
          <Input
            id="media"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
        </div>
        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({selectedFile.type})
          </div>
        )}
        <Button onClick={handleProcess} disabled={!selectedFile} className="w-full">
          Process Media
        </Button>
      </CardContent>
    </Card>
  );
};

export default MediaUploader;