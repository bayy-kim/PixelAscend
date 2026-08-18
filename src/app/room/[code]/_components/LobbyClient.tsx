"use client";

import { useEffect, useState, useTransition } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { selectCharacterAndPalette, toggleReady, startGame, leaveLobby } from "../_actions/lobby";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Check, Play, LogOut } from "lucide-react";
import { CharacterIcon } from "@/app/_components/CharacterIcons";

interface CharacterData {
  id: string;
  name: string;
  archetype: string;
  abilityName: string;
  abilityDesc: string;
  role: string;
}

interface PlayerData {
  id: string;
  userId: string;
  characterId: string;
  cosmeticVariant: string;
  isReady: boolean;
  user: {
    name: string;
    nickname: string | null;
    image: string | null;
    avatarUrl: string | null;
  };
}

interface LobbyClientProps {
  roomCode: string;
  currentUserId: string;
  hostUserId: string;
  initialPlayers: PlayerData[];
  charactersList: CharacterData[];
}

export default function LobbyClient({
  roomCode,
  currentUserId,
  hostUserId,
  initialPlayers,
  charactersList,
}: LobbyClientProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerData[]>(initialPlayers);
  const [selectedChar, setSelectedChar] = useState<string>("");
  const [selectedPalette, setSelectedPalette] = useState<string>("default");
  const [error, setError] = useState<string | null>(null);
  
  const [isPendingReady, startReadyTransition] = useTransition();
  const [isPendingPick, startPickTransition] = useTransition();
  const [isPendingStart, startStartTransition] = useTransition();

  const isHost = currentUserId === hostUserId;
  const selfPlayer = players.find((p) => p.userId === currentUserId);
  const isReady = selfPlayer?.isReady || false;

  useEffect(() => {
    // Set initially chosen values
    if (selfPlayer) {
      setSelectedChar(selfPlayer.characterId);
      setSelectedPalette(selfPlayer.cosmeticVariant);
    }
  }, [players, currentUserId]);

  useEffect(() => {
    const channelName = `presence-room-${roomCode}`;
    const channel = pusherClient.subscribe(channelName);

    // Live update triggers
    channel.bind("player-joined", () => {
      // Re-fetch users simply by refreshing route to fetch dynamic server state
      router.refresh();
    });

    channel.bind("player-left", () => {
      router.refresh();
    });

    channel.bind("player-picked-character", () => {
      router.refresh();
    });

    channel.bind("player-ready", () => {
      router.refresh();
    });

    channel.bind("game-started", () => {
      router.push(`/room/${roomCode}/play`);
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [roomCode, router]);

  // Handle character choice
  const handlePickCharacter = (charId: string, palette: string = "default") => {
    if (isReady) return; // Cannot change while ready
    setError(null);

    startPickTransition(async () => {
      const res = await selectCharacterAndPalette(roomCode, charId, palette);
      if (res?.error) {
        setError(res.error);
      } else {
        setSelectedChar(charId);
        setSelectedPalette(palette);
      }
    });
  };

  const handleReadyToggle = () => {
    setError(null);
    startReadyTransition(async () => {
      const res = await toggleReady(roomCode, !isReady);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  const handleStartGame = () => {
    setError(null);
    startStartTransition(async () => {
      const res = await startGame(roomCode);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  const handleLeave = async () => {
    await leaveLobby(roomCode);
    router.push("/dashboard");
  };

  // Find active data for selected character
  const activeCharData = charactersList.find((c) => c.id === selectedChar);

  // Palettes preset definitions
  const palettes = ["default", "crimson", "moss", "azure"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl mx-auto px-4 py-8">
      {/* Left panel: Character Selection (7 columns) */}
      <div className="lg:col-span-8 flex flex-col gap-6 bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 shadow-xl">
        <div className="flex flex-col gap-2">
          <span className="font-press-start text-[10px] text-[#E8A33D]">LOBBY ROOM: {roomCode}</span>
          <h1 className="text-2xl font-bold font-sans">Pilih Karakter & Kosmetik</h1>
        </div>

        {/* Character grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {charactersList.map((char) => {
            const isTakenByOther = players.some(
              (p) => p.characterId === char.id && p.userId !== currentUserId
            );
            const isSelected = selectedChar === char.id;

            return (
              <button
                key={char.id}
                onClick={() => !isTakenByOther && handlePickCharacter(char.id, selectedPalette)}
                disabled={isTakenByOther || isReady}
                className={`p-4 bg-[#1B1A1F] border-2 rounded flex flex-col items-center gap-3 transition-all relative overflow-hidden group ${
                  isSelected 
                    ? "border-[#E8A33D] shadow-[0_0_10px_rgba(232,163,61,0.2)]" 
                    : isTakenByOther 
                    ? "opacity-40 border-transparent cursor-not-allowed" 
                    : "border-transparent hover:border-[#4B4A57]"
                }`}
              >
                {/* Character preview sprite representation */}
                <CharacterIcon characterId={char.id} className="w-14 h-14" />

                <div className="flex flex-col items-center text-center gap-1">
                  <span className="text-xs font-bold leading-tight font-sans text-[#F2E9D8] truncate max-w-[100px]">
                    {char.name.split(" — ")[0]}
                  </span>
                  <span className="text-[9px] text-[#F2E9D8]/40 font-mono">
                    {char.role}
                  </span>
                </div>

                {isTakenByOther && (
                  <div className="absolute inset-0 bg-[#C24A4A]/10 flex items-center justify-center">
                    <span className="bg-[#C24A4A] text-white text-[8px] font-press-start px-2 py-0.5 rounded">TAKEN</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected character detail & color palette swapper */}
        {activeCharData && (
          <div className="bg-[#1B1A1F] rounded p-6 border border-[#4B4A57]/20 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Selected representation */}
              <CharacterIcon characterId={activeCharData.id} className="w-16 h-16" />

              <div className="flex-1 flex flex-col gap-2">
                <span className="text-sm font-press-start text-[#E8A33D]">
                  {activeCharData.name}
                </span>
                <span className="text-xs text-[#F2E9D8]/60 font-mono">
                  Ability: <span className="text-[#5FA35A] font-bold">{activeCharData.abilityName}</span>
                </span>
                <p className="text-xs text-[#F2E9D8]/80 leading-relaxed max-w-xl">
                  {activeCharData.abilityDesc}
                </p>
              </div>
            </div>

            {/* Customization: Palette Swapper (2D CSS Filters representation mapping) */}
            <div className="flex flex-col gap-3 pt-4 border-t border-[#4B4A57]/15">
              <span className="text-xs font-press-start text-[#F2E9D8]/50">Kustomisasi Outfit Varian</span>
              <div className="flex flex-wrap gap-2">
                {palettes.map((palette) => (
                  <button
                    key={palette}
                    onClick={() => handlePickCharacter(selectedChar, palette)}
                    disabled={isReady}
                    className={`h-10 px-3.5 rounded text-[10px] font-press-start border transition-all uppercase cursor-pointer min-h-[44px] ${
                      selectedPalette === palette
                        ? "border-[#E8A33D] bg-[#E8A33D]/10 text-[#E8A33D]"
                        : "border-[#4B4A57]/30 bg-transparent text-[#F2E9D8]/60 hover:text-white"
                    }`}
                  >
                    {palette}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: Lobby Players Presence (4 columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6 bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#4B4A57]/20 pb-4">
          <h2 className="font-press-start text-xs text-[#F2E9D8]">PLAYER LIST</h2>
          <span className="font-mono text-xs text-[#F2E9D8]/50">({players.length}/8)</span>
        </div>

        {/* Players list */}
        <div className="flex flex-col gap-3 flex-1 min-h-[220px]">
          {players.map((player) => {
            const isPlayerHost = player.userId === hostUserId;
            
            return (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-[#1B1A1F] border border-[#4B4A57]/15 rounded font-mono text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded overflow-hidden border border-[#4B4A57]/20">
                    <Image
                      src={player.user.avatarUrl || player.user.image || "/favicon.ico"}
                      alt={player.user.name}
                      fill
                      className="object-cover pixelated"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold flex items-center gap-2">
                      {player.user.nickname || player.user.name}
                      {isPlayerHost && (
                        <span className="text-[8px] px-1 bg-[#E8A33D]/20 text-[#E8A33D] rounded border border-[#E8A33D]/30">HOST</span>
                      )}
                    </span>
                    <span className="text-[8px] text-[#F2E9D8]/40">
                      Char: {player.characterId.toUpperCase()} ({player.cosmeticVariant})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {player.isReady || isPlayerHost ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#5FA35A] font-bold bg-[#5FA35A]/10 px-2 py-0.5 rounded border border-[#5FA35A]/20">
                      <Check className="w-3. h-3" />
                      READY
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#F2E9D8]/30 font-bold px-2 py-0.5 bg-[#4B4A57]/10 rounded border border-[#4B4A57]/20">
                      WAIT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions panel */}
        <div className="flex flex-col gap-4 border-t border-[#4B4A57]/20 pt-4">
          {error && (
            <div className="p-3 bg-[#C24A4A]/20 border border-[#C24A4A]/40 rounded text-xs text-[#C24A4A] font-mono">
              [ERR] {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleLeave}
              className="px-4 h-12 flex items-center justify-center border border-[#C24A4A]/40 text-[#C24A4A] hover:bg-[#C24A4A]/10 rounded font-mono text-xs cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={isPendingStart || players.length < 2 || !players.every(p => p.isReady || p.userId === hostUserId)}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs rounded transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                MULAI PERMAINAN
              </button>
            ) : (
              <button
                onClick={handleReadyToggle}
                disabled={isPendingReady}
                className={`flex-1 h-12 flex items-center justify-center gap-2 font-press-start text-xs rounded transition-all cursor-pointer shadow-md border-b-4 border-black/30 ${
                  isReady
                    ? "bg-[#C24A4A] hover:bg-[#d65c5c] text-white"
                    : "bg-[#5FA35A] hover:bg-[#72b86d] text-white"
                }`}
              >
                {isReady ? "BATAL READY" : "READY"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
