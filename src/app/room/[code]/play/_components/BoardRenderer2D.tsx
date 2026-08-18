"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  // Tile 1 is at Bottom-Left, Tile 100 at Top-Left
  const tileGrid = useMemo(() => {
    const tiles = [];
    for (let i = 1; i <= 100; i++) {
      const rowFromBottom = Math.floor((i - 1) / 10);
      const colInRow = (i - 1) % 10;
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
    }> = [];

    const tilePosMap = new Map<number, { row: number; col: number }>();
    tileGrid.forEach((t) => tilePosMap.set(t.tileNumber, { row: t.row, col: t.col }));

    boardLayout.forEach((eff) => {
      if ((eff.type === "boost" || eff.type === "hazard") && eff.targetTile) {
        const from = tilePosMap.get(eff.tileNumber);
        const to = tilePosMap.get(eff.targetTile);
        if (from && to) {
          // Center of tiles in percentage (0-100%)
          list.push({
            fromTile: eff.tileNumber,
            toTile: eff.targetTile,
            type: eff.type,
            x1: from.col * 10 + 5,
            y1: from.row * 10 + 5,
            x2: to.col * 10 + 5,
            y2: to.row * 10 + 5,
          });
        }
      }
    });

    return list;
  }, [boardLayout, tileGrid]);

  return (
    <div className="relative w-full max-w-[500px] aspect-square mx-auto bg-[#1B1A1F] p-2 rounded-lg border-2 border-[#4B4A57] shadow-xl overflow-hidden select-none">
      {/* Board Theme Background */}
      <div 
        className="absolute inset-2 bg-cover bg-center opacity-40 pixelated pointer-events-none"
        style={{ backgroundImage: "url('/themes/wanderers-path/board.png')" }}
      />

      {/* Grid Layout (10x10) */}
      <div className="relative w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5">
        {/* SVG Connector Lines for Ladders & Vines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            <marker id="arrow-hazard" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#A855F7" />
            </marker>
            <marker id="arrow-boost" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22C55E" />
            </marker>
          </defs>

          {connections.map((conn, idx) => {
            const isBoost = conn.type === "boost";
            return (
              <g key={idx}>
                {/* Outer shadow/glow line */}
                <line
                  x1={`${conn.x1}%`}
                  y1={`${conn.y1}%`}
                  x2={`${conn.x2}%`}
                  y2={`${conn.y2}%`}
                  stroke="#1B1A1F"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                {/* Main connector line */}
                <line
                  x1={`${conn.x1}%`}
                  y1={`${conn.y1}%`}
                  x2={`${conn.x2}%`}
                  y2={`${conn.y2}%`}
                  stroke={isBoost ? "#22C55E" : "#A855F7"}
                  strokeWidth="3.5"
                  strokeDasharray={isBoost ? "none" : "5 3"}
                  strokeLinecap="round"
                  markerEnd={isBoost ? "url(#arrow-boost)" : "url(#arrow-hazard)"}
                  opacity="0.95"
                />
              </g>
            );
          })}
        </svg>

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
              <span className="absolute top-0.5 left-0.5 opacity-60 text-[8px]">
                {tileNumber}
              </span>

              {/* Tile Type Badge/Icon */}
              {isHazard && <span className="text-[9px] text-purple-200">VINE</span>}
              {isBoost && <span className="text-[9px] text-green-200">LADDER</span>}
              {isEvent && <span className="text-[9px] text-amber-300">EVT</span>}
              {isPowerup && <span className="text-[9px] text-yellow-300">CHEST</span>}
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
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="relative flex flex-col items-center">
              {/* Turn Highlight Ring */}
              {isCurrentTurn && (
                <motion.div
                  className="absolute -inset-1 rounded-full border-2 border-[#E8A33D] shadow-[0_0_8px_#E8A33D]"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              )}

              {/* 2D Chibi Pixel Sprite */}
              <PixelSprite
                characterId={player.characterId}
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
