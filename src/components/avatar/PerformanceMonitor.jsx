import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * PerformanceMonitor.jsx
 * Monitors 60 FPS in R3F render loop & dynamically scales pixel ratio to optimize performance.
 */
export const PerformanceMonitor = ({ onFpsReport = null, showOverlay = false }) => {
  const { gl } = useThree();
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const [fps, setFps] = useState(60);

  useFrame(() => {
    frameCountRef.current += 1;
    const now = performance.now();
    const delta = now - lastTimeRef.current;

    if (delta >= 1000) {
      const currentFps = Math.round((frameCountRef.current * 1000) / delta);
      setFps(currentFps);
      if (onFpsReport) onFpsReport(currentFps);

      // Dynamic Performance Scaling: Lower pixel ratio if FPS drops below 40
      if (currentFps < 35) {
        gl.setPixelRatio(1);
      } else if (currentFps > 55) {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  });

  if (!showOverlay) return null;

  return (
    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30 z-20">
      <span>{fps} FPS</span>
    </div>
  );
};

export default PerformanceMonitor;
