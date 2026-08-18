"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-[#1B1A1F] text-[#F2E9D8] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-[#232129] border border-[#C24A4A]/40 rounded-xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#C24A4A]/10 border border-[#C24A4A]/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[#C24A4A]" />
        </div>
        <h1 className="font-press-start text-lg text-[#C24A4A]">Terjadi Kesalahan!</h1>
        <p className="font-sans text-sm text-[#F2E9D8]/70 leading-relaxed">
          {error.message || "Sistem mengalami masalah tidak terduga saat memproses tindakan Anda."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
          <button
            onClick={() => reset()}
            className="flex-1 bg-[#E8A33D] hover:bg-[#F2B75C] text-[#1B1A1F] font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" /> Coba Lagi
          </button>
          <Link
            href="/dashboard"
            className="flex-1 bg-[#4B4A57]/30 hover:bg-[#4B4A57]/50 text-[#F2E9D8] font-bold py-3 px-4 rounded-md transition-colors border border-[#4B4A57]/50 flex items-center justify-center min-h-[44px]"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
