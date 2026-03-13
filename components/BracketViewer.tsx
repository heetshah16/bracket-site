"use client";

import { useRef, useEffect } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import type { BracketSlot } from "@/types/player";

interface BracketViewerProps {
  slots: BracketSlot[];
  highlightSeed: number | null;
}

// Inner controls component — must be rendered inside TransformWrapper
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-20">
      <button
        onClick={() => zoomIn()}
        className="w-8 h-8 rounded text-sm font-bold flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{ backgroundColor: "#2F3648", color: "#BEC0C6", border: "1px solid #22293B" }}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => zoomOut()}
        className="w-8 h-8 rounded text-sm font-bold flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{ backgroundColor: "#2F3648", color: "#BEC0C6", border: "1px solid #22293B" }}
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        onClick={() => resetTransform()}
        className="w-8 h-8 rounded text-xs flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{ backgroundColor: "#2F3648", color: "#BEC0C6", border: "1px solid #22293B" }}
        aria-label="Reset view"
      >
        ⌂
      </button>
    </div>
  );
}

export default function BracketViewer({ slots, highlightSeed }: BracketViewerProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const prevSeedRef = useRef<number | null>(null);

  useEffect(() => {
    if (highlightSeed === null || highlightSeed === prevSeedRef.current) return;
    prevSeedRef.current = highlightSeed;

    const slot = slots.find((s) => s.seed === highlightSeed && s.round === 1);
    if (!slot || !transformRef.current) return;

    // Pan/zoom to the player's bracket slot.
    // The SVG is 3550×82035. We center the viewport on the slot at scale 1.5.
    const viewportWidth = window.innerWidth * 0.75; // approximate bracket area width
    const viewportHeight = window.innerHeight;
    const scale = 1.5;
    const targetX = -(slot.x * scale) + viewportWidth / 2;
    const targetY = -(slot.y * scale) + viewportHeight / 2;

    setTimeout(() => {
      transformRef.current?.setTransform(targetX, targetY, scale, 600);
    }, 50);
  }, [highlightSeed, slots]);

  return (
    <div
      className="w-full h-full relative"
      style={{ overflow: "hidden" }}
    >
      <TransformWrapper
        ref={transformRef}
        initialScale={0.15}
        minScale={0.04}
        maxScale={3}
        limitToBounds={false}
        doubleClick={{ disabled: false }}
        wheel={{ step: 0.1 }}
      >
        <>
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "3550px", height: "82035px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bracket-enhanced.svg"
              alt="Tournament bracket"
              width={3550}
              height={82035}
              style={{ display: "block", imageRendering: "crisp-edges" }}
            />
          </TransformComponent>
          <ZoomControls />
        </>
      </TransformWrapper>

      {/* Tip overlay */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full pointer-events-none select-none"
        style={{ backgroundColor: "rgba(47, 54, 72, 0.7)", color: "#BEC0C6" }}
      >
        Scroll to zoom · Drag to pan · Search a player to jump to their slot
      </div>
    </div>
  );
}
