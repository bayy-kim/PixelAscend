import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeSelectionClient } from "./_components/ThemeSelectionClient";

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

  return <ThemeSelectionClient themes={themes} />;
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
