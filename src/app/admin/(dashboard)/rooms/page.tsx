import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { db } from "@/lib/db";
import { forceEndRoom } from "@/app/admin/_actions/moderation";
import { Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminRoomsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";

  // Load rooms with optional search filter by code
  const rooms = await db.room.findMany({
    where: query
      ? {
          code: { contains: query.toUpperCase() },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      theme: true,
      players: {
        include: {
          user: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-press-start text-[#E8A33D]">Room Moderation</h1>
          <p className="text-xs text-[#F2E9D8]/60 font-mono">Daftar room game aktif & selesai di PixelAscend</p>
        </div>

        {/* Search Bar */}
        <form method="GET" className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#F2E9D8]/40 absolute left-3 top-3" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Cari kode room..."
            className="w-full bg-[#232129] border border-[#4B4A57]/30 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-[#F2E9D8] focus:outline-none focus:border-[#E8A33D]"
          />
        </form>
      </div>

      <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#4B4A57]/30 bg-[#1B1A1F]/50 text-xs font-mono text-[#F2E9D8]/50">
                <th className="p-4">Room Code</th>
                <th className="p-4">Theme</th>
                <th className="p-4">Players</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length > 0 ? (
                rooms.map((room: any) => (
                  <tr key={room.id} className="border-b border-[#4B4A57]/10 text-sm font-mono">
                    <td className="p-4 font-bold text-[#E8A33D]">{room.code}</td>
                    <td className="p-4 text-[#F2E9D8]/80">{room.theme.name}</td>
                    <td className="p-4 text-xs">
                      {room.players.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {room.players.map((rp: any) => (
                            <span key={rp.id}>
                              - {rp.user.nickname || rp.user.name} ({rp.characterId})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#F2E9D8]/30">Empty</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        room.status === "IN_PROGRESS"
                          ? "bg-[#5FA35A]/20 text-[#5FA35A]"
                          : room.status === "LOBBY"
                          ? "bg-blue-950 text-blue-400 border border-blue-800"
                          : "bg-[#4B4A57]/20 text-[#F2E9D8]/50"
                      }`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#F2E9D8]/60">
                      {room.createdAt.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      {(room.status === "LOBBY" || room.status === "IN_PROGRESS") && (
                        <form
                          action={async () => {
                            "use server";
                            await forceEndRoom(room.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs px-3 py-1.5 bg-[#C24A4A] hover:bg-[#d65c5c] text-white border-b-2 border-black rounded font-press-start cursor-pointer"
                            style={{ touchAction: "manipulation" }}
                          >
                            FORCE END
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#F2E9D8]/30">
                    Tidak ada room aktif atau selesai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
