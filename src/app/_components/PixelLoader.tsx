"use client";

import { useEffect, useState } from "react";

export default function PixelLoader() {
  const [frame, setFrame] = useState(0);

  // Cycle running frames (3 frames loop)
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 3);
    }, 150); // 150ms run cycle speed (matches spritesheet step standards)
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#1B1A1F] z-50 flex flex-col items-center justify-center gap-6">
      {/* 3D-ish pixel frame border wrapper */}
      <div className="relative p-6 bg-[#232129] border-2 border-[#E8A33D] rounded flex flex-col items-center gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A33D]/5 rounded-full blur-2xl"></div>

        {/* Chibi running animation container */}
        <div className="w-16 h-20 flex flex-col items-center justify-end relative overflow-hidden">
          {/* Chibi model character representation */}
          <div 
            className="flex flex-col items-center transition-transform duration-100"
            style={{
              transform: `translateY(${frame === 1 ? "-4px" : "0px"})`, // bounce while running
            }}
          >
            {/* Chibi head */}
            <div className="w-8 h-8 rounded-full bg-[#ffe4e1] border-2 border-[#1b1a1f] relative flex items-center justify-center shadow-md">
              {/* Chibi dot eyes */}
              <div className="absolute top-3 left-2 w-1.5 h-1.5 bg-[#1b1a1f] rounded-full"></div>
              <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-[#1b1a1f] rounded-full"></div>
              {/* Hair block */}
              <div className="absolute top-0 inset-x-0 h-2 bg-[#78350f] rounded-t-full"></div>
            </div>

            {/* Chibi body & arms */}
            <div className="w-7 h-8 bg-[#E8A33D] border-2 border-[#1b1a1f] rounded-sm relative flex items-center justify-between mt-[-2px] z-10">
              {/* Left/Right arm swing frames */}
              <div 
                className="w-1.5 h-4 bg-[#78350f] border border-[#1b1a1f] absolute top-1 left-[-4px]"
                style={{
                  transform: `rotate(${frame === 0 ? "30deg" : frame === 2 ? "-30deg" : "0deg"})`,
                  transformOrigin: "top center",
                }}
              ></div>
              <div 
                className="w-1.5 h-4 bg-[#78350f] border border-[#1b1a1f] absolute top-1 right-[-4px]"
                style={{
                  transform: `rotate(${frame === 0 ? "-30deg" : frame === 2 ? "30deg" : "0deg"})`,
                  transformOrigin: "top center",
                }}
              ></div>
            </div>

            {/* Chibi legs run cycle */}
            <div className="flex gap-2 justify-center mt-[-2px] w-full">
              <div 
                className="w-2 h-4 bg-[#1b1a1f] rounded-b-sm"
                style={{
                  height: frame === 0 ? "10px" : frame === 1 ? "14px" : "12px",
                }}
              ></div>
              <div 
                className="w-2 h-4 bg-[#1b1a1f] rounded-b-sm"
                style={{
                  height: frame === 0 ? "14px" : frame === 1 ? "10px" : "12px",
                }}
              ></div>
            </div>
          </div>

          {/* Running dust particles shadow line beneath */}
          <div className="w-10 h-1 bg-[#4B4A57]/30 rounded-full mt-2"></div>
        </div>

        {/* Loading text typography display */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-press-start text-[9px] text-[#E8A33D] tracking-widest animate-pulse">
            LOADING GAME
          </span>
          <span className="text-[10px] text-[#F2E9D8]/40 font-mono">
            Mempersiapkan petualangan...
          </span>
        </div>
      </div>
    </div>
  );
}
