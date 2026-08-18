"use client";

import { useEffect, useState } from "react";
import { PixelSprite } from "./PixelSprite";
import { Dices, Sparkles } from "lucide-react";

const HEROES = ["dawn", "ember", "wren", "sable", "thistle", "brack"];

export default function PixelLoader() {
  const [mode, setMode] = useState<"hero" | "dice">("hero");
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    // Switch between Running Hero (facing right) and Spinning Pixel Dice every 1.8 seconds
    const interval = setInterval(() => {
      setMode((prev) => (prev === "hero" ? "dice" : "hero"));
      setHeroIndex((prev) => (prev + 1) % HEROES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  const currentHero = HEROES[heroIndex];

  return (
    <div className="fixed inset-0 bg-[#1B1A1F]/95 z-50 flex flex-col items-center justify-center p-4 select-none backdrop-blur-sm">
      {/* 8-bit retro pixel card wrapper */}
      <div className="relative p-6 bg-[#232129] border-2 border-[#E8A33D] rounded-xl flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A33D]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Chibi Running / Dice Morph Box */}
        <div className="w-24 h-24 bg-[#1B1A1F] border-2 border-[#4B4A57] rounded-lg flex items-center justify-center relative overflow-hidden shadow-inner">
          {mode === "hero" ? (
            <div className="flex flex-col items-center justify-center relative">
              {/* Chibi Pixel Sprite Running Right */}
              <PixelSprite
                characterId={currentHero}
                direction="right"
                isWalking={true}
                size={48}
                className="animate-bounce"
              />
              {/* Running dust shadow line */}
              <div className="w-8 h-1 bg-[#E8A33D]/20 rounded-full mt-[-2px] animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              {/* Rolling 3D-ish Dice Animation */}
              <div className="animate-spin duration-300">
                <Dices className="w-10 h-10 text-[#E8A33D] drop-shadow-[0_2px_4px_rgba(232,163,61,0.4)]" />
              </div>
              <Sparkles className="w-3 h-3 text-[#5FA35A] animate-ping" />
            </div>
          )}
        </div>

        {/* Dynamic Loading Typography */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5FA35A] animate-ping" />
            {mode === "hero" ? `HERO ${currentHero.toUpperCase()} RUNNING` : "ROLLING DESTINY..."}
          </span>
          <span className="text-[11px] text-[#F2E9D8]/60 font-mono">
            {mode === "hero"
              ? "Mendaki puncak Summit 100..."
              : "Menghitung takdir lemparan dadu..."}
          </span>
        </div>
      </div>
    </div>
  );
}
