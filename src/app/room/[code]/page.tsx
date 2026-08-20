import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { joinLobby } from "./_actions/lobby";
import LobbyClient from "./_components/LobbyClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function RoomLobbyPage({ params }: PageProps) {
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
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!room) {
    redirect("/dashboard");
  }

  // Redirect to gameplay if game is already IN_PROGRESS or FINISHED
  if (room.status === "IN_PROGRESS") {
    redirect(`/room/${roomCode}/play`);
  } else if (room.status === "FINISHED") {
    redirect(`/dashboard`); // game already over
  }

  // Automatically join lobby for current user if not already in player list
  let roomPlayers = room.players;
  const inLobby = roomPlayers.some((p: any) => p.userId === session.user.id);
  if (!inLobby) {
    const joinRes = await joinLobby(roomCode);
    if (joinRes?.error) {
      redirect("/dashboard");
    }
    // Re-fetch players list
    const updatedRoom = await db.room.findUnique({
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
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    if (updatedRoom) {
      roomPlayers = updatedRoom.players;
    }
  }

  // Load all characters from catalog to choose from
  const characters = await db.character.findMany({
    where: { isEnabled: true },
    select: {
      id: true,
      name: true,
      archetype: true,
      abilityName: true,
      abilityDesc: true,
      role: true,
    },
  });

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
            BOARD: {room.themeId.replace("-", " ").toUpperCase()}
          </span>
        </div>
      </header>

      {/* Lobby content */}
      <main className="flex-1 flex items-center">
        <LobbyClient
          roomCode={roomCode}
          currentUserId={session.user.id}
          hostUserId={room.hostUserId}
          initialPlayers={roomPlayers}
          charactersList={characters}
        />
      </main>
    </div>
  );
}
