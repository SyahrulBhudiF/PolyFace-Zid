import { useCallback, useRef, useState } from "react";
import { FILE_UPLOAD } from "../constants";

interface UseVideoUploadOptions {
  onFileSelect?: (file: File) => void;
  onError?: (error: string) => void;
}

interface UseVideoUploadReturn {
  selectedFile: File | null;
  previewUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
  isDragOver: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDragLeave: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  togglePlayPause: () => void;
  toggleMute: () => void;
  reset: () => void;
  setFile: (file: File) => void;
}

export function useVideoUpload(
  options: UseVideoUploadOptions = {},
): UseVideoUploadReturn {
  const { onFileSelect, onError } = options;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) {
        const errorMsg = "Please select a valid video file";
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      }

      if (file.size > FILE_UPLOAD.maxSize) {
        const errorMsg = `File size must be less than ${FILE_UPLOAD.maxSize / (1024 * 1024)}MB`;
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(url);
      setError(null);
      setIsPlaying(false);
      setIsMuted(false);

      onFileSelect?.(file);
      return true;
    },
    [previewUrl, onFileSelect, onError],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const reset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setIsPlaying(false);
    setIsMuted(false);
    setIsDragOver(false);
    setError(null);
  }, [previewUrl]);

  const setFile = useCallback(
    (file: File) => {
      processFile(file);
    },
    [processFile],
  );

  return {
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
    setFile,
  };
}
