
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface UseHandTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onHandUpdate: (isOpen: boolean, score: number, position: { x: number, y: number }) => void;
}

export const useHandTracking = ({ videoRef, onHandUpdate }: UseHandTrackingProps) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        landmarkerRef.current = landmarker;
        setIsReady(true);
      } catch (err) {
        console.error("Error loading hand landmarker:", err);
        setError("Failed to load hand tracking. Please ensure camera permissions are granted.");
      }
    };

    initLandmarker();
    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  const predict = useCallback(() => {
    if (!landmarkerRef.current || !videoRef.current || !videoRef.current.videoWidth) {
      requestRef.current = requestAnimationFrame(predict);
      return;
    }

    const startTimeMs = performance.now();
    const result: HandLandmarkerResult = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      
      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const middleTip = landmarks[12];
      const thumbTip = landmarks[4];
      const pinkyTip = landmarks[20];

      // Hand scale reference (depth approximation)
      const scale = Math.sqrt(
        Math.pow(indexMcp.x - wrist.x, 2) + 
        Math.pow(indexMcp.y - wrist.y, 2)
      );

      // Open/Close detection logic
      const extension = Math.sqrt(
        Math.pow(middleTip.x - wrist.x, 2) + 
        Math.pow(middleTip.y - wrist.y, 2)
      );
      
      const spread = Math.sqrt(
          Math.pow(thumbTip.x - pinkyTip.x, 2) +
          Math.pow(thumbTip.y - pinkyTip.y, 2)
      );

      const extensionRatio = extension / scale;
      const spreadRatio = spread / scale;

      const isOpen = extensionRatio > 1.3 && spreadRatio > 0.8;
      const opennessScore = Math.min(Math.max((extensionRatio - 0.8) / 1.5, 0), 1);

      // --- POSITION CALCULATION ---
      // Get the centroid of the hand (approximate center)
      // Landmarks are normalized [0, 1].
      // We want x=0 to be center, -1 left, 1 right for rotation math later.
      // But MediaPipe x=0 is left, x=1 is right.
      // NOTE: Video is usually mirrored by CSS, but landmarks are relative to source.
      // If user moves hand Right in physical space -> Camera sees movement Left -> Landmarks x decreases.
      
      // We calculate raw center first (0 to 1)
      const rawX = (wrist.x + indexMcp.x + pinkyTip.x) / 3;
      const rawY = (wrist.y + indexMcp.y + pinkyTip.y) / 3;

      onHandUpdate(isOpen, opennessScore, { x: rawX, y: rawY });
    } else {
        // Default idle state
        onHandUpdate(true, 1, { x: 0.5, y: 0.5 });
    }

    requestRef.current = requestAnimationFrame(predict);
  }, [onHandUpdate, videoRef]);

  // Start prediction loop when ready
  useEffect(() => {
    if (isReady && videoRef.current) {
      requestRef.current = requestAnimationFrame(predict);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isReady, predict, videoRef]);

  return { isReady, error };
};
