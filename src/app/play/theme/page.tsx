import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Theme list component (wrapped in Suspense because of Next.js 15 search params handling / client state boundaries)
async function ThemeList() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Fetch only active themes
  const themes = await db.theme.findMany({
    where: { isEnabled: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      {themes.map((theme: any) => (
        <div
          key={theme.id}
          className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col justify-between gap-6 shadow-xl hover:border-[#E8A33D]/50 transition-all group"
        >
          <div className="flex flex-col gap-4">
            {/* Board Preview placeholder */}
            <div className="relative w-full h-40 bg-[#1B1A1F] rounded overflow-hidden border border-[#4B4A57]/20 flex items-center justify-center">
              {/* Retro bands background style to avoid AI slop gradient (DESIGN.md) */}
              <div className="absolute inset-0 bg-[#7C4DA8]/10 flex flex-col justify-between p-2">
                <div className="h-4 bg-[#7C4DA8]/20 w-1/2 rounded"></div>
                <div className="h-4 bg-[#5FA35A]/20 w-3/4 rounded self-end"></div>
                <div className="h-4 bg-[#E8A33D]/10 w-2/3 rounded"></div>
              </div>
              <span className="font-press-start text-[9px] text-[#F2E9D8]/30 group-hover:text-[#E8A33D] transition-colors">
                [BOARD PREVIEW]
              </span>
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

          <Link
            href={`/play/room?themeId=${theme.id}`}
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs rounded transition-all cursor-pointer shadow-md"
          >
            PILIH TEMA
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ))}
    </div>
  );
}

export default async function SelectThemePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#1B1A1F] text-[#F2E9D8]">
      {/* Header bar */}
      <header className="w-full bg-[#232129]/60 border-b border-[#4B4A57]/30 py-4 px-6 sticky top-0 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E8A33D] rounded-sm flex items-center justify-center font-press-start text-xs text-[#1B1A1F] font-bold">
              P
            </div>
            <span className="font-press-start text-xs tracking-wider">
              Pixel<span className="text-[#E8A33D]">Ascend</span>
            </span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-mono text-[#F2E9D8]/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
      </header>

      {/* Select Theme area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center gap-10">
        <div className="flex flex-col gap-2 text-center">
          <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest uppercase">Langkah 1</span>
          <h1 className="text-3xl font-bold font-sans">Pilih Tema Papan</h1>
          <p className="text-sm text-[#F2E9D8]/50 font-mono">MVP: Pilih Wanderer&apos;s Path untuk memulai permainan</p>
        </div>

        <Suspense
          fallback={
            <div className="font-press-start text-xs text-[#F2E9D8]/30 animate-pulse py-12">
              Loading Themes...
            </div>
          }
        >
          <ThemeList />
        </Suspense>
      </main>
    </div>
  );
}
