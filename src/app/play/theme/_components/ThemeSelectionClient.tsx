"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/app/play/room/_actions/room";

interface ThemeItem {
  id: string;
  name: string;
  description: string;
  boardArtUrl: string | null;
  isEnabled: boolean;
  isDefault: boolean;
}

interface ThemeSelectionClientProps {
  themes: ThemeItem[];
}

export function ThemeSelectionClient({ themes }: ThemeSelectionClientProps) {
  const router = useRouter();
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateRoom = (themeId: string) => {
    setError(null);
    setSelectedThemeId(themeId);

    startTransition(async () => {
      try {
        const res = await createRoom(themeId);
        if (res?.error) {
          setError(res.error);
          setSelectedThemeId(null);
        } else if (res?.code) {
          router.push(`/room/${res.code}`);
        }
      } catch (err: any) {
        console.error("Failed to create room:", err);
        setError("Gagal membuat room. Silakan coba lagi.");
        setSelectedThemeId(null);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      {error && (
        <div className="w-full p-4 bg-[#C24A4A]/20 border border-[#C24A4A]/50 rounded-lg text-[#C24A4A] text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {themes.map((theme) => {
          const isLoadingThis = isPending && selectedThemeId === theme.id;

          return (
            <div
              key={theme.id}
              className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col justify-between gap-6 shadow-xl hover:border-[#E8A33D]/50 transition-all group"
            >
              <div className="flex flex-col gap-4">
                {/* Board Preview Original Texture */}
                <div className="relative w-full h-44 bg-[#1B1A1F] rounded overflow-hidden border border-[#4B4A57]/30 flex items-center justify-center group-hover:border-[#E8A33D]/60 transition-colors">
                  <Image
                    src={theme.boardArtUrl || "/themes/wanderers-path/board.png"}
                    alt={theme.name}
                    fill
                    className="object-cover pixelated opacity-80 group-hover:opacity-100 transition-opacity"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1B1A1F] via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-2">
                    <span className="font-press-start text-[9px] text-[#E8A33D] bg-[#1B1A1F]/90 px-2 py-1 rounded border border-[#E8A33D]/40">
                      PIXEL BOARD 10x10
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold font-sans group-hover:text-[#E8A33D] transition-colors">
                    {theme.name}
                  </h2>
                  <p className="text-xs text-[#F2E9D8]/70 leading-relaxed font-sans">
                    {theme.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCreateRoom(theme.id)}
                disabled={isPending}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs rounded transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingThis ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1B1A1F]" />
                    <span>MEMBUAT ROOM...</span>
                  </>
                ) : (
                  <>
                    <span>BUAT ROOM DENGAN TEMA INI</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
