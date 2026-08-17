"use client";

import { useEffect, useState, useRef } from "react";
import { getTileCoordinates, BOARD_LAYOUT, TileEffect } from "@/lib/game/board";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Skull, ArrowUp } from "lucide-react";

interface PlayerData {
  userId: string;
  characterId: string;
  cosmeticVariant: string;
  position: number;
  user: {
    name: string;
    nickname: string | null;
  };
}

interface BoardRendererProps {
  players: PlayerData[];
}

export default function BoardRenderer({ players }: BoardRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState<number>(32);

  // Responsive tile sizing (PRD / DESIGN.md: tile calculated based on screen width)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // 10 tiles per row
        const newSize = Math.max(28, Math.min(64, Math.floor(width / 10)));
        setTileSize(newSize);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate 100 tiles array in order 100 down to 1 (top down rendering)
  const tiles: number[] = [];
  for (let r = 9; r >= 0; r--) {
    // odd rows are rendered left-to-right, even rows right-to-left
    const isOddRow = r % 2 !== 0;
    if (isOddRow) {
      for (let c = 9; c >= 0; c--) {
        tiles.push(r * 10 + c + 1);
      }
    } else {
      for (let c = 0; c <= 9; c++) {
        tiles.push(r * 10 + c + 1);
      }
    }
  }

  return (
    <div ref={containerRef} className="w-full flex justify-center py-4 select-none">
      <div 
        className="grid grid-cols-10 border-4 border-[#4B4A57] bg-[#1B1A1F] relative overflow-hidden"
        style={{
          width: `${tileSize * 10}px`,
          height: `${tileSize * 10}px`,
        }}
      >
        {/* Render 100 tiles */}
        {tiles.map((tileNum) => {
          const effect = BOARD_LAYOUT[tileNum];
          const isHazard = effect?.type === "hazard";
          const isBoost = effect?.type === "boost";
          const isEvent = effect?.type === "event";
          const isPowerup = effect?.type === "powerup";

          // Calculate offset coloring based on standard chess-board pattern
          const { x, y } = getTileCoordinates(tileNum);
          const isAlternate = (x + y) % 2 === 0;

          return (
            <div
              key={tileNum}
              style={{
                width: `${tileSize}px`,
                height: `${tileSize}px`,
              }}
              className={`relative border border-[#4B4A57]/20 flex items-center justify-center transition-colors ${
                isHazard 
                  ? "bg-[#7C4DA8]/20 border-[#7C4DA8]/40" 
                  : isBoost 
                  ? "bg-[#5FA35A]/20 border-[#5FA35A]/40"
                  : isEvent
                  ? "bg-blue-950/20 border-blue-800/40"
                  : isPowerup
                  ? "bg-amber-950/20 border-amber-800/40"
                  : isAlternate
                  ? "bg-[#232129]"
                  : "bg-[#232129]/40"
              }`}
            >
              {/* Tile index number (pixel typography, very small font inside tiles) */}
              <span className="absolute top-1 left-1 text-[8px] font-mono text-[#F2E9D8]/30">
                {tileNum}
              </span>

              {/* Visual icons overlay for events/hazards */}
              {isHazard && <Skull className="w-4 h-4 text-[#7C4DA8]/50 animate-pulse" />}
              {isBoost && <ArrowUp className="w-4 h-4 text-[#5FA35A]/50 animate-bounce" />}
              {isPowerup && <Sparkles className="w-4 h-4 text-[#E8A33D]/40" />}

              {/* Summit 100 gold highlight */}
              {tileNum === 100 && (
                <div className="absolute inset-0 bg-[#E8A33D]/10 border border-[#E8A33D]/50 flex items-center justify-center">
                  <span className="text-[9px] font-press-start text-[#E8A33D] animate-pulse">WIN</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Dynamic Animated Tokens */}
        {players.map((player) => {
          if (player.position === 0) return null; // not on board yet

          const coords = getTileCoordinates(player.position);
          
          // Animate tokens using Framer Motion transform parameters (x and y offset values) to avoid layout thrashing
          return (
            <motion.div
              key={player.userId}
              initial={{
                x: coords.x * tileSize,
                y: coords.y * tileSize,
              }}
              animate={{
                x: coords.x * tileSize,
                y: coords.y * tileSize,
              }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
              }}
              style={{
                width: `${tileSize}px`,
                height: `${tileSize}px`,
              }}
              className="absolute top-0 left-0 flex items-center justify-center z-20 pointer-events-none"
            >
              {/* Token representation with color-swap variation (PRD palettes swap) */}
              <div 
                className={`w-6 h-6 rounded-sm border border-white flex items-center justify-center text-[10px] font-press-start font-bold shadow-lg ${
                  player.cosmeticVariant === "crimson"
                    ? "bg-[#C24A4A] text-white"
                    : player.cosmeticVariant === "moss"
                    ? "bg-[#5FA35A] text-white"
                    : player.cosmeticVariant === "azure"
                    ? "bg-blue-600 text-white"
                    : "bg-[#E8A33D] text-[#1B1A1F]"
                }`}
              >
                {player.characterId[0].toUpperCase()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
