import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import GameplayClient from "./_components/GameplayClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function GameplayPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const resolvedParams = await params;
  const roomCode = resolvedParams.code;

  // Retrieve room database state
  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: {
      players: {
        include: {
          user: {
            select: {
              name: true,
              nickname: true,
              image: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    redirect("/dashboard");
  }

  // Redirect back to lobby if not started yet
  if (room.status === "LOBBY") {
    redirect(`/room/${roomCode}`);
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

          <span className="font-press-start text-[10px] text-[#E8A33D]">
            ROOM CODE: {roomCode}
          </span>
        </div>
      </header>

      {/* Gameplay content */}
      <main className="flex-1 flex items-center">
        <GameplayClient
          roomCode={roomCode}
          currentUserId={session.user.id}
          initialPlayers={room.players}
          currentTurnIndex={room.currentTurnIndex}
          status={room.status}
        />
      </main>
    </div>
  );
}
