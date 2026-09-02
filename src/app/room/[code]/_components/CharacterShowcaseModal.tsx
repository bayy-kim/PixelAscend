"use client";

import Image from "next/image";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film, Eye, Sparkles, Shield, Zap } from "lucide-react";
import { getCharacterMedia } from "@/lib/character-meta";

interface CharacterShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: {
    id: string;
    name: string;
    archetype: string;
    role: string;
    abilityName: string;
    abilityDesc: string;
  } | null;
}

export const CharacterShowcaseModal: React.FC<CharacterShowcaseModalProps> = ({
  isOpen,
  onClose,
  character,
}) => {
  const [activeTab, setActiveTab] = useState<"video" | "pov">("video");

  if (!isOpen || !character) return null;

  const media = getCharacterMedia(character.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#1B1A1F] border-2 border-[#E8A33D] rounded-xl shadow-2xl overflow-hidden text-[#F2E9D8]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#232129] border-b border-[#4B4A57]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E8A33D]" />
              <h3 className="font-press-start text-xs sm:text-sm text-[#E8A33D] truncate">
                {character.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#F2E9D8]/70 hover:text-white hover:bg-[#4B4A57]/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Viewport (Video / POV JPEG) */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-[#4B4A57]">
            {activeTab === "video" ? (
              <video
                src={media.walkVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <Image
                src={media.povImage}
                alt={character.name}
                fill
                className="object-cover"
                unoptimized
              />
            )}

            {/* Media Mode Selector Floating Pills */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveTab("video")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md ${
                  activeTab === "video"
                    ? "bg-[#E8A33D] text-[#1B1A1F] scale-105"
                    : "bg-[#232129]/80 text-[#F2E9D8] border border-[#4B4A57] hover:bg-[#4B4A57]"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                Animasi MP4
              </button>
              <button
                onClick={() => setActiveTab("pov")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md ${
                  activeTab === "pov"
                    ? "bg-[#E8A33D] text-[#1B1A1F] scale-105"
                    : "bg-[#232129]/80 text-[#F2E9D8] border border-[#4B4A57] hover:bg-[#4B4A57]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                POV Portrait
              </button>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-4 sm:p-5 space-y-3 bg-[#1B1A1F]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">Arketipe:</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#4B4A57]/40 border border-[#4B4A57] text-[#E8A33D]">
                {character.archetype}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">Peran Strategi:</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#5FA35A]/20 border border-[#5FA35A]/50 text-[#5FA35A]">
                {character.role}
              </span>
            </div>

            {/* Ability Card */}
            <div className="mt-3 p-3 rounded-lg bg-[#232129] border border-[#4B4A57] space-y-1.5">
              <div className="flex items-center gap-2 text-[#E8A33D]">
                <Zap className="w-4 h-4" />
                <span className="font-bold text-sm font-press-start text-xs">
                  {character.abilityName}
                </span>
              </div>
              <p className="text-xs text-[#F2E9D8]/90 leading-relaxed font-sans">
                {character.abilityDesc}
              </p>
            </div>

            {/* Footer Action */}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-[#E8A33D] hover:bg-[#F2B75C] text-[#1B1A1F] font-bold rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg"
              >
                Tutup Showcase
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
