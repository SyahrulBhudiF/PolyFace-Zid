/**
 * Video Uploader Component
 *
 * Handles video file selection, drag-and-drop, and preview.
 */

import { Pause, Play, RotateCcw, Video, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VideoUploaderProps {
  // State from useVideoUpload hook
  selectedFile: File | null;
  previewUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
  isDragOver: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Actions from useVideoUpload hook
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDragLeave: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  togglePlayPause: () => void;
  toggleMute: () => void;
  reset: () => void;
}

export function VideoUploader({
  selectedFile,
  previewUrl,
  isPlaying,
  isMuted,
  isDragOver,
  error,
  videoRef,
  handleFileChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  togglePlayPause,
  toggleMute,
  reset,
}: VideoUploaderProps) {
  const handleClick = () => {
    document.getElementById("video-input")?.click();
  };

  return (
    <button
      type="button"
      className={`relative w-full border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
        isDragOver
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <Input
        id="video-input"
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <VideoPreview
          previewUrl={previewUrl}
          selectedFile={selectedFile}
          isPlaying={isPlaying}
          isMuted={isMuted}
          videoRef={videoRef}
          togglePlayPause={togglePlayPause}
          toggleMute={toggleMute}
          reset={reset}
        />
      ) : (
        <UploadPlaceholder />
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </button>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function UploadPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
        <Video className="w-8 h-8 text-gray-400" />
      </div>
      <div>
        <p className="text-lg font-medium text-gray-700">
          Drop your video here, or click to browse
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Supports MP4, AVI, MOV, WebM up to 100MB
        </p>
      </div>
    </div>
  );
}

interface VideoPreviewProps {
  previewUrl: string;
  selectedFile: File | null;
  isPlaying: boolean;
  isMuted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  togglePlayPause: () => void;
  toggleMute: () => void;
  reset: () => void;
}

function VideoPreview({
  previewUrl,
  selectedFile,
  isPlaying,
  isMuted,
  videoRef,
  togglePlayPause,
  toggleMute,
  reset,
}: VideoPreviewProps) {
  const handlePlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlayPause();
  };

  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="relative w-80 h-60 mx-auto rounded-xl overflow-hidden shadow-lg bg-black">
        <video
          ref={videoRef}
          src={previewUrl}
          className="w-full h-full object-contain"
          controls={false}
          muted={isMuted}
        />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayPauseClick}
              className="p-1 text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMuteClick}
              className="p-1 text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-white text-xs truncate max-w-32">
            {selectedFile?.name}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPauseClick}
          className="gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Preview
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetClick}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Change Video
        </Button>
      </div>
    </div>
  );
}
