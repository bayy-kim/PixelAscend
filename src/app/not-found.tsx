import Link from "next/link";
import { Ghost, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-[#1B1A1F] text-[#F2E9D8] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-[#232129] border border-[#4B4A57]/40 rounded-xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#E8A33D]/10 border border-[#E8A33D]/30 flex items-center justify-center">
          <Ghost className="w-8 h-8 text-[#E8A33D]" />
        </div>
        <h1 className="font-press-start text-2xl text-[#E8A33D]">404</h1>
        <h2 className="font-press-start text-xs text-[#F2E9D8]">Halaman Tidak Ditemukan</h2>
        <p className="font-sans text-sm text-[#F2E9D8]/70 leading-relaxed">
          Halaman atau room yang Anda cari tidak ada atau telah berakhir.
        </p>

        <Link
          href="/dashboard"
          className="w-full mt-4 bg-[#E8A33D] hover:bg-[#F2B75C] text-[#1B1A1F] font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Home className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
