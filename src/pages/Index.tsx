"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import MediaUploader from "@/components/MediaUploader";
import SonificationControls from "@/components/SonificationControls";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-4 text-primary">Synesthesique</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Converts visual data from images or videos into scientific sonification,
          allowing you to hear the objective properties and changes within visuals.
          The sound is multi-layered, with each visual aspect adding a distinct sonic dimension.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-8">
        <MediaUploader />
        <SonificationControls />
      </div>

      <p className="text-sm text-muted-foreground mt-4 max-w-2xl text-center">
        **Note:** The advanced audio analysis and synthesis engine for multi-layered sonification
        is a complex feature that typically requires specialized audio processing libraries
        (like Web Audio API with custom oscillators and effects) or a dedicated backend service.
        This current setup provides the user interface for media input and a placeholder for future
        sonification capabilities.
      </p>

      <MadeWithDyad />
    </div>
  );
};

export default Index;