import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

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

          <form
            action={async () => {
              "use server";
              const { createRoom } = await import("@/app/play/room/_actions/room");
              const res = await createRoom(theme.id);
              if (res?.code) {
                redirect(`/room/${res.code}`);
              }
            }}
          >
            <button
              type="submit"
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs rounded transition-all cursor-pointer shadow-md"
            >
              BUAT ROOM DENGAN TEMA INI
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
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
          <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest uppercase">Langkah 2 (Khusus Host)</span>
          <h1 className="text-3xl font-bold font-sans">Pilih Tema Papan Arena</h1>
          <p className="text-sm text-[#F2E9D8]/50 font-mono">Pilih suasana arena untuk room baru yang akan kamu buat</p>
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
