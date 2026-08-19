import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import ProfileEditor from "./_components/ProfileEditor";
import { LogOut, Play, Shield, History } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Fetch current user from database to ensure fresh states (nickname, custom avatar, role)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      roomPlayers: {
        include: {
          room: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Calculate statistics from RoomPlayer entries where Room status = FINISHED
  const finishedGames = user.roomPlayers.filter(
    (rp: any) => rp.room.status === "FINISHED"
  );
  const totalGames = finishedGames.length;
  const totalWins = finishedGames.filter((rp: any) => rp.isWinner).length;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  // Retrieve last 5 matches info
  const lastMatches = user.roomPlayers
    .filter((rp: any) => rp.room.status === "FINISHED" || rp.room.status === "ABANDONED")
    .sort((a: any, b: any) => b.joinedAt.getTime() - a.joinedAt.getTime())
    .slice(0, 5);

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
          
          <div className="flex items-center gap-4">
            {/* Show Admin access link if role is ADMIN */}
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 border border-[#C24A4A]/50 bg-[#C24A4A]/10 text-xs font-press-start text-[#C24A4A] rounded hover:bg-[#C24A4A]/20 transition-all"
              >
                <Shield className="w-4 h-4" />
                ADMIN PANEL
              </Link>
            )}

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[#F2E9D8]/60 hover:text-[#C24A4A] text-xs font-mono rounded transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main dashboard grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Profile & CTA (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Main CTA: Play Now */}
          <div className="w-full bg-gradient-to-r from-[#232129] to-[#2b2933] border-2 border-[#E8A33D]/50 rounded-lg p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A33D]/5 rounded-full blur-3xl"></div>
            
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest">SIAP BERTUALANG?</span>
              <h2 className="text-2xl font-bold font-sans">Mulai Permainan Baru</h2>
              <p className="text-sm text-[#F2E9D8]/70 max-w-sm">
                Pilih tema board-mu, buat lobby room atau gabung bersama kawan secara instan.
              </p>
            </div>
            
            <Link
              href="/play/theme"
              className="flex items-center justify-center gap-3 px-8 h-14 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs tracking-wider rounded-md border-b-4 border-[#4B4A57] transition-all shadow-lg min-w-[180px]"
            >
              <Play className="w-4 h-4 fill-current" />
              MAIN SEKARANG
            </Link>
          </div>

          {/* Profile Editor component */}
          <ProfileEditor
            initialNickname={user.nickname}
            initialName={user.name}
            initialAvatar={user.avatarUrl || user.image}
          />
        </div>

        {/* Right Side: Stats & Match History (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md">
              <span className="text-[10px] font-press-start text-[#F2E9D8]/50 mb-2">TOTAL</span>
              <span className="text-2xl font-press-start font-bold text-[#F2E9D8]">{totalGames}</span>
              <span className="text-[9px] font-mono text-[#F2E9D8]/30 mt-1 uppercase">Matches</span>
            </div>
            <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md">
              <span className="text-[10px] font-press-start text-[#5FA35A] mb-2">WIN</span>
              <span className="text-2xl font-press-start font-bold text-[#5FA35A]">{totalWins}</span>
              <span className="text-[9px] font-mono text-[#F2E9D8]/30 mt-1 uppercase">Victory</span>
            </div>
            <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-md">
              <span className="text-[10px] font-press-start text-[#E8A33D] mb-2">RATE</span>
              <span className="text-2xl font-press-start font-bold text-[#E8A33D]">{winRate}%</span>
              <span className="text-[9px] font-mono text-[#F2E9D8]/30 mt-1 uppercase">Win Rate</span>
            </div>
          </div>

          {/* Match History */}
          <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col gap-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-[#4B4A57]/20 pb-3">
              <History className="w-5 h-5 text-[#E8A33D]" />
              <span className="font-press-start text-xs text-[#F2E9D8]">Match History</span>
            </div>

            <div className="flex flex-col gap-3 min-h-[200px]">
              {lastMatches.length > 0 ? (
                lastMatches.map((match: any) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 bg-[#1B1A1F] border border-[#4B4A57]/10 rounded font-mono text-xs"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-[#F2E9D8]">
                        Room: {match.room.code}
                      </span>
                      <span className="text-[9px] text-[#F2E9D8]/40">
                        {match.joinedAt.toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 bg-[#4B4A57]/20 rounded text-[#F2E9D8]/70">
                        Char: {match.characterId.toUpperCase()}
                      </span>
                      {match.isWinner ? (
                        <span className="text-[10px] font-bold text-[#5FA35A] bg-[#5FA35A]/10 px-2 py-0.5 rounded border border-[#5FA35A]/20">
                          WIN
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#C24A4A] bg-[#C24A4A]/10 px-2 py-0.5 rounded border border-[#C24A4A]/20">
                          LOSE
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#F2E9D8]/40">
                  <span className="font-press-start text-[10px] mb-2">Empty Log</span>
                  <p className="text-xs max-w-[200px] leading-relaxed">
                    Belum ada pertandingan. Tekan "Main Sekarang" untuk memulai!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
