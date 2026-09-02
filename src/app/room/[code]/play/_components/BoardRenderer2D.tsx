"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PixelSprite, Direction } from "@/app/_components/PixelSprite";
import { TileEffect } from "@/lib/game/board";

export interface PlayerRenderState {
  userId: string;
  name: string;
  characterId: string;
  position: number;
  cosmeticVariant?: string;
  isCurrentTurn: boolean;
}

export interface BoardTileEffect extends TileEffect {
  tileNumber: number;
}

export interface ActiveEmote {
  id: string;
  characterId: string;
  emote: string;
  userId: string;
}

interface BoardRenderer2DProps {
  boardLayout: BoardTileEffect[];
  players: PlayerRenderState[];
  currentTurnUserId?: string;
  onTileClick?: (tileIndex: number) => void;
  activeEmotes?: ActiveEmote[];
  activeCutscene?: {
    type: "hazard" | "boost" | "victory" | null;
    message?: string;
  };
  onSkipCutscene?: () => void;
}

export const BoardRenderer2D: React.FC<BoardRenderer2DProps> = ({
  boardLayout,
  players,
  currentTurnUserId,
  onTileClick,
  activeEmotes = [],
  activeCutscene,
  onSkipCutscene,
}) => {
  // Precompute 100 tile positions (Boustrophedon grid: 10x10)
  // Tile 1 is at Bottom-Left (row 9, col 0), Tile 100 is at Top-Right (row 0, col 9)
  const tileGrid = useMemo(() => {
    const tiles = [];
    for (let i = 1; i <= 100; i++) {
      const rowFromBottom = Math.floor((i - 1) / 10);
      const colInRow = (i - 1) % 10;
      // Standard Snake & Ladder grid layout:
      // Row 0 from bottom (1-10): Left-to-Right (col 0 to 9)
      // Row 1 from bottom (11-20): Right-to-Left (col 9 to 0)
      // ...
      // Row 9 from bottom (91-100): Left-to-Right (col 0 to 9), so Tile 100 is at Top-Right!
      const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
      const row = 9 - rowFromBottom;
      tiles.push({ tileNumber: i, row, col });
    }
    return tiles;
  }, []);

  // Quick lookup for special tile effects
  const effectMap = useMemo(() => {
    const map = new Map<number, BoardTileEffect>();
    boardLayout.forEach((eff) => {
      map.set(eff.tileNumber, eff);
    });
    return map;
  }, [boardLayout]);

  // Compute SVG overlay lines for ladders (boost) and vines/snakes (hazard)
  const connections = useMemo(() => {
    const list: Array<{
      fromTile: number;
      toTile: number;
      type: "boost" | "hazard";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      angle: number;
      length: number;
    }> = [];

    const tilePosMap = new Map<number, { row: number; col: number }>();
    tileGrid.forEach((t) => tilePosMap.set(t.tileNumber, { row: t.row, col: t.col }));

    boardLayout.forEach((eff) => {
      if ((eff.type === "boost" || eff.type === "hazard") && eff.targetTile) {
        const from = tilePosMap.get(eff.tileNumber);
        const to = tilePosMap.get(eff.targetTile);
        if (from && to) {
          // Center of tiles in percentage (0-100%)
          const x1 = from.col * 10 + 5;
          const y1 = from.row * 10 + 5;
          const x2 = to.col * 10 + 5;
          const y2 = to.row * 10 + 5;
          
          // Math for rotating the repeating background image element
          const deltaX = x2 - x1;
          const deltaY = y2 - y1;
          const length = Math.hypot(deltaX, deltaY); // percentage distance
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

          list.push({
            fromTile: eff.tileNumber,
            toTile: eff.targetTile,
            type: eff.type,
            x1, y1, x2, y2,
            length, angle
          });
        }
      }
    });

    return list;
  }, [boardLayout, tileGrid]);

  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full max-w-[100vw] sm:max-w-[500px] aspect-square mx-auto bg-[#1B1A1F] p-1.5 sm:p-2 rounded-lg border-2 border-[#4B4A57] shadow-2xl overflow-hidden select-none">
      {/* Board Theme Background */}
      <div 
        className="absolute inset-2 bg-cover bg-center opacity-60 pixelated pointer-events-none rounded"
        style={{ backgroundImage: "url('/themes/wanderers-path/board.png')" }}
      />

      {/* Full-Board SVG Overlay for Organic Curved Snakes & Luminous Ladders */}
      <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-10 overflow-visible">
        <defs>
          <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7C4DA8" floodOpacity="0.8" />
          </filter>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#E8A33D" floodOpacity="0.8" />
          </filter>
        </defs>

        {connections.map((conn, idx) => {
          const isBoost = conn.type === "boost";
          const dx = conn.x2 - conn.x1;
          const dy = conn.y2 - conn.y1;
          const dist = Math.hypot(dx, dy) || 1;
          const ux = dx / dist;
          const uy = dy / dist;
          const px = -uy;
          const py = ux;
          
          const offset = 2.2; // Rail offset percentage

          if (isBoost) {
            // Render Crisp Pixel Art Wooden Ladder with Side Rails & Rungs
            const rail1X1 = conn.x1 + px * offset;
            const rail1Y1 = conn.y1 + py * offset;
            const rail1X2 = conn.x2 + px * offset;
            const rail1Y2 = conn.y2 + py * offset;

            const rail2X1 = conn.x1 - px * offset;
            const rail2Y1 = conn.y1 - py * offset;
            const rail2X2 = conn.x2 - px * offset;
            const rail2Y2 = conn.y2 - py * offset;

            const numRungs = Math.max(3, Math.floor(dist / 8));
            const rungs = [];
            for (let r = 1; r <= numRungs; r++) {
              const t = r / (numRungs + 1);
              const rx1 = (conn.x1 + dx * t) + px * offset;
              const ry1 = (conn.y1 + dy * t) + py * offset;
              const rx2 = (conn.x1 + dx * t) - px * offset;
              const ry2 = (conn.y1 + dy * t) - py * offset;
              rungs.push({ rx1, ry1, rx2, ry2 });
            }

            return (
              <g key={`ladder-${idx}`} filter="url(#goldGlow)">
                {/* Shadow */}
                <line x1={`${rail1X1 + 0.4}%`} y1={`${rail1Y1 + 0.4}%`} x2={`${rail1X2 + 0.4}%`} y2={`${rail1Y2 + 0.4}%`} stroke="#000" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
                <line x1={`${rail2X1 + 0.4}%`} y1={`${rail2Y1 + 0.4}%`} x2={`${rail2X2 + 0.4}%`} y2={`${rail2Y2 + 0.4}%`} stroke="#000" strokeWidth="4" opacity="0.5" strokeLinecap="round" />

                {/* Outer Gold Rails */}
                <line x1={`${rail1X1}%`} y1={`${rail1Y1}%`} x2={`${rail1X2}%`} y2={`${rail1Y2}%`} stroke="#E8A33D" strokeWidth="4" strokeLinecap="round" />
                <line x1={`${rail2X1}%`} y1={`${rail2Y1}%`} x2={`${rail2X2}%`} y2={`${rail2Y2}%`} stroke="#E8A33D" strokeWidth="4" strokeLinecap="round" />
                
                {/* Inner Wood Core */}
                <line x1={`${rail1X1}%`} y1={`${rail1Y1}%`} x2={`${rail1X2}%`} y2={`${rail1Y2}%`} stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />
                <line x1={`${rail2X1}%`} y1={`${rail2Y1}%`} x2={`${rail2X2}%`} y2={`${rail2Y2}%`} stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />

                {/* Step Rungs */}
                {rungs.map((r, rIdx) => (
                  <g key={`rung-${rIdx}`}>
                    <line x1={`${r.rx1}%`} y1={`${r.ry1}%`} x2={`${r.rx2}%`} y2={`${r.ry2}%`} stroke="#E8A33D" strokeWidth="3" strokeLinecap="square" />
                    <line x1={`${r.rx1}%`} y1={`${r.ry1}%`} x2={`${r.rx2}%`} y2={`${r.ry2}%`} stroke="#8B5A2B" strokeWidth="1" strokeLinecap="square" />
                  </g>
                ))}
              </g>
            );
          } else {
            // Render Serpentine Curved Snake with Glowing Head
            const curveOffset = (idx % 2 === 0 ? 12 : -12);
            const midX = (conn.x1 + conn.x2) / 2 + px * curveOffset;
            const midY = (conn.y1 + conn.y2) / 2 + py * curveOffset;
            const pathData = `M ${conn.x1} ${conn.y1} Q ${midX} ${midY} ${conn.x2} ${conn.y2}`;

            return (
              <g key={`snake-${idx}`} filter="url(#purpleGlow)">
                {/* Black Shadow Path */}
                <path d={pathData} fill="none" stroke="#000000" strokeWidth="9" opacity="0.6" strokeLinecap="round" />
                {/* Dark Purple Outer Body */}
                <path d={pathData} fill="none" stroke="#4B1059" strokeWidth="7" strokeLinecap="round" />
                {/* Bright Violet Inner Body */}
                <path d={pathData} fill="none" stroke="#7C4DA8" strokeWidth="4.5" strokeLinecap="round" />
                {/* Spine Dots */}
                <path d={pathData} fill="none" stroke="#E85D3D" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
                {/* Snake Head Dot on Top Tile */}
                <circle cx={`${conn.x1}%`} cy={`${conn.y1}%`} r="5" fill="#7C4DA8" stroke="#E85D3D" strokeWidth="1.5" />
                <circle cx={`${conn.x1}%`} cy={`${conn.y1}%`} r="2" fill="#E85D3D" />
              </g>
            );
          }
        })}
      </svg>

      {/* Grid Layout (10x10) */}
      <div className="relative w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5 z-0">

        {tileGrid.map(({ tileNumber }) => {
          const effect = effectMap.get(tileNumber);
          const isHazard = effect?.type === "hazard";
          const isBoost = effect?.type === "boost";
          const isEvent = effect?.type === "event";
          const isPowerup = effect?.type === "powerup";

          return (
            <div
              key={tileNumber}
              onClick={() => onTileClick?.(tileNumber)}
              className={`relative flex items-center justify-center rounded-none border border-[#4B4A57]/30 text-[10px] font-pixel text-[#F2E9D8]/70 transition-colors ${
                isHazard
                  ? "bg-[#7C4DA8]/80 text-white font-bold"
                  : isBoost
                  ? "bg-[#5FA35A]/80 text-white font-bold"
                  : isEvent
                  ? "bg-[#E8A33D]/40 text-[#E8A33D]"
                  : isPowerup
                  ? "bg-[#232129] border-[#E8A33D]"
                  : "bg-[#232129]/80 hover:bg-[#4B4A57]/50"
              }`}
            >
              <span className="absolute top-0.5 left-0.5 font-mono text-[9px] font-bold text-[#F2E9D8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] z-10">
                {tileNumber}
              </span>

              {/* Tile Type Badge/Icon */}
              {isHazard && <span className="text-[7px] font-bold text-purple-200 truncate mt-2">VINE</span>}
              {isBoost && <span className="text-[7px] font-bold text-green-200 truncate mt-2">LADDER</span>}
              {isEvent && <span className="text-[7px] font-bold text-amber-300 truncate mt-2">EVT</span>}
              {isPowerup && <span className="text-[7px] font-bold text-yellow-300 truncate mt-2">CHEST</span>}
            </div>
          );
        })}
      </div>

      {/* Render 2D Animated Player Tokens */}
      {players.map((player) => {
        const currentTile = tileGrid.find((t) => t.tileNumber === Math.max(1, Math.min(100, player.position))) || tileGrid[0];
        const isCurrentTurn = player.userId === currentTurnUserId;

        // Position percentage relative to 10x10 grid
        const leftPercent = currentTile.col * 10;
        const topPercent = currentTile.row * 10;

        return (
          <motion.div
            key={player.userId}
            className="absolute z-10 pointer-events-none flex flex-col items-center justify-center w-[10%] h-[10%]"
            animate={{
              x: `${leftPercent * 10}%`,
              y: `${topPercent * 10}%`,
              scale: isCurrentTurn ? 1.15 : 1,
            }}
            transition={shouldReduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="relative flex flex-col items-center">
              {/* Turn Highlight Ring & Camera Beacon */}
              {isCurrentTurn && (
                <>
                  <motion.div
                    className="absolute -inset-2 rounded-full border-2 border-[#E8A33D] shadow-[0_0_12px_#E8A33D]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.1, 0.95] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: -18 }}
                    className="absolute top-0 text-[10px] font-bold font-press-start text-[#E8A33D] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-30"
                  >
                    ▼
                  </motion.div>
                </>
              )}

              {/* 2D Chibi Pixel Sprite */}
              <PixelSprite
                characterId={player.characterId}
                variant={player.cosmeticVariant || "default"}
                direction="down"
                isWalking={isCurrentTurn}
                size={32}
              />

              {/* Real-time Floating Speech Bubble Emote */}
              {activeEmotes.filter((e) => e.userId === player.userId).map((e) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -28, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute top-0 bg-[#F2E9D8] text-[#1B1A1F] px-2 py-0.5 rounded-full border border-[#1B1A1F] shadow-lg text-[10px] font-bold font-mono whitespace-nowrap z-20 pointer-events-none"
                >
                  {e.emote}
                </motion.div>
              ))}

              {/* Player Name Tag */}
              <span className="mt-[-4px] bg-[#1B1A1F]/90 text-[#F2E9D8] text-[7px] px-1 rounded border border-[#4B4A57] truncate max-w-[40px]">
                {player.name}
              </span>
            </div>
          </motion.div>
        );
      })}

      {/* Cutscene / Effect Overlay (Tap to Skip gesture supported) */}
      <AnimatePresence>
        {activeCutscene && activeCutscene.type && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onSkipCutscene}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-4 backdrop-blur-xs text-center cursor-pointer ${
              activeCutscene.type === "hazard"
                ? "bg-[#7C4DA8]/90 text-white"
                : activeCutscene.type === "boost"
                ? "bg-[#5FA35A]/90 text-white"
                : "bg-[#1B1A1F]/90 text-[#E8A33D]"
            }`}
          >
            <h3 className="font-press-start text-lg mb-2 uppercase tracking-wide">
              {activeCutscene.type === "hazard"
                ? "SHADOW VINE!"
                : activeCutscene.type === "boost"
                ? "ANCIENT LADDER!"
                : "VICTORY!"}
            </h3>
            <p className="font-sans text-sm text-[#F2E9D8]">{activeCutscene.message}</p>
            <span className="mt-4 text-[9px] font-mono text-white/60 tracking-widest animate-pulse">
              [ TAP UNTUK SKIP ]
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
