"use client";

import { useState, useTransition } from "react";
import { createRoom, joinRoomByCode } from "../_actions/room";
import { useRouter } from "next/navigation";

interface RoomFormProps {
  themeId: string | null;
}

export default function RoomForm({ themeId }: RoomFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [isPendingCreate, startCreateTransition] = useTransition();
  const [isPendingJoin, startJoinTransition] = useTransition();

  const handleCreate = () => {
    if (!themeId) {
      setError("Silakan pilih tema terlebih dahulu.");
      return;
    }
    setError(null);

    startCreateTransition(async () => {
      const res = await createRoom(themeId);
      if (res?.error) {
        setError(res.error);
      } else if (res?.code) {
        router.push(`/room/${res.code}`);
      }
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError("Kode room harus berupa 6 karakter.");
      return;
    }
    setError(null);

    startJoinTransition(async () => {
      const res = await joinRoomByCode(code);
      if (res?.error) {
        setError(res.error);
      } else if (res?.code) {
        router.push(`/room/${res.code}`);
      }
    });
  };

  return (
    <div className="w-full max-w-md bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-8 flex flex-col gap-8 shadow-2xl">
      {/* Create Room box */}
      <div className="flex flex-col gap-4 border-b border-[#4B4A57]/20 pb-8">
        <h2 className="font-press-start text-xs text-[#E8A33D]">BUAT ROOM BARU</h2>
        <p className="text-xs text-[#F2E9D8]/60 leading-relaxed font-sans">
          Jadilah host dan mainkan game ular tangga RPG menggunakan tema terpilih.
        </p>
        <button
          onClick={handleCreate}
          disabled={isPendingCreate || !themeId}
          className="w-full h-12 flex items-center justify-center bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs rounded transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          {isPendingCreate ? "MEMBUAT ROOM..." : "BUAT ROOM"}
        </button>
      </div>

      {/* Join Room box */}
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <h2 className="font-press-start text-xs text-[#5FA35A]">GABUNG KE ROOM</h2>
        <p className="text-xs text-[#F2E9D8]/60 leading-relaxed font-sans">
          Masukkan 6-karakter kode room yang dibagikan oleh temanmu.
        </p>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KODE6X"
            className="flex-1 bg-[#1B1A1F] border border-[#4B4A57]/30 rounded px-4 py-3 text-center text-sm font-press-start text-[#F2E9D8] tracking-widest focus:outline-none focus:border-[#5FA35A]"
            maxLength={6}
            disabled={isPendingJoin}
            required
          />
          <button
            type="submit"
            disabled={isPendingJoin}
            className="bg-[#5FA35A] hover:bg-[#72b86d] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs px-6 rounded transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isPendingJoin ? "JOIN..." : "JOIN"}
          </button>
        </div>
      </form>

      {/* Error state alert */}
      {error && (
        <div className="p-3 bg-[#C24A4A]/20 border border-[#C24A4A]/40 rounded text-xs text-[#C24A4A] font-mono">
          [ERR] {error}
        </div>
      )}
    </div>
  );
}
