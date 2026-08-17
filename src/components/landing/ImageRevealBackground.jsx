import React, { useEffect, useRef, useState } from "react";

export const BG_IMAGE_1 = "/robot1.png";
export const BG_IMAGE_2 = "/robot3.png";

export function ImageRevealBackground() {
  const maskRef = useRef(null);
  const patternRef = useRef(null);

  const mouse = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });
  const smooth = useRef({ x: mouse.current.x, y: mouse.current.y });
  const gridOffset = useRef({ x: 0, y: 0 });
  const canvas = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    canvas.current = document.createElement("canvas");

    const handleMouseMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);

    let frame;
    const loop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (canvas.current) {
        if (canvas.current.width !== w || canvas.current.height !== h) {
          canvas.current.width = w;
          canvas.current.height = h;
        }

        // Smooth cursor
        smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
        smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;

        // Parallax Grid
        const nx = smooth.current.x / w - 0.5;
        const ny = smooth.current.y / h - 0.5;
        gridOffset.current.x += (nx * 16 - gridOffset.current.x) * 0.06;
        gridOffset.current.y += (ny * 16 - gridOffset.current.y) * 0.06;

        if (patternRef.current) {
          patternRef.current.setAttribute("x", gridOffset.current.x.toString());
          patternRef.current.setAttribute("y", gridOffset.current.y.toString());
        }

        // Draw soft radial gradient mask on canvas
        const ctx = canvas.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, w, h);

          const radius = Math.round(Math.min(420, Math.max(160, w * 0.16)));
          const cx = smooth.current.x;
          const cy = smooth.current.y;

          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          grad.addColorStop(0, "rgba(255,255,255,1)");
          grad.addColorStop(0.4, "rgba(255,255,255,1)");
          grad.addColorStop(0.6, "rgba(255,255,255,0.75)");
          grad.addColorStop(0.75, "rgba(255,255,255,0.4)");
          grad.addColorStop(0.88, "rgba(255,255,255,0.12)");
          grad.addColorStop(1, "rgba(255,255,255,0)");

          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          if (maskRef.current) {
            const dataUrl = canvas.current.toDataURL();
            maskRef.current.style.maskImage = `url(${dataUrl})`;
            maskRef.current.style.webkitMaskImage = `url(${dataUrl})`;
            maskRef.current.style.maskSize = "100% 100%";
            maskRef.current.style.webkitMaskSize = "100% 100%";
          }
        }
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const [cell, setCell] = useState(64);
  useEffect(() => {
    const onResize = () =>
      setCell(
        Math.round(Math.min(64, Math.max(36, window.innerWidth * 0.028))),
      );
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="block absolute inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 md:bg-black/30 z-1 pointer-events-none" />
      {/* Base Layer */}
      <div
        className="absolute inset-0 bg-fill md:bg-contain bg-center bg-no-repeat z-0 pointer-events-none"
        style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
      />

      {/* Reveal Layer */}
      <div
        ref={maskRef}
        className="absolute inset-0 bg-fill md:bg-contain bg-center bg-no-repeat mix-blend-luminosity"
        style={{ backgroundImage: `url(${BG_IMAGE_2})` }}
      />
      {/* Subtle SVG grid overlay */}
      {/* <svg 
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.10 }}
      >
        <defs>
          <pattern
            id="parallax-grid"
            ref={patternRef}
            width={cell}
            height={cell}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${cell} 0 L 0 0 0 ${cell}`}
              fill="none"
              stroke="#64748b"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#parallax-grid)" />
      </svg> */}
    </div>
  );
}
