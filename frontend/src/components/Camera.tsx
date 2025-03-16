import React, { useRef, useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface CameraProps {
  onError?: (error: string) => void;
  className?: string;
}

const Camera: React.FC<CameraProps> = React.memo(({ onError, className = "" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      if (streamRef.current) return; // Prevents re-initializing the camera

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setHasPermission(true);
            setIsCameraActive(true);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
        onError && onError("Camera access denied. Please allow camera permissions.");
        toast({
          title: "Camera Error",
          description: "Unable to access your camera. Please check permissions.",
          variant: "destructive",
        });
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // 🔥 Empty dependency array ensures useEffect runs ONLY ONCE

  return (
    <div className={`camera-container rounded-xl overflow-hidden ${className}`}>
      {hasPermission === false && (
        <div className="camera-overlay flex flex-col gap-2 p-4 text-white">
          <span className="text-lg font-medium">Camera Access Required</span>
          <p className="text-sm opacity-80">Please enable camera permissions.</p>
        </div>
      )}
      {hasPermission === null && (
        <div className="camera-overlay flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
    </div>
  );
});

export default Camera;
