"use client";

import { useEffect, useState, useTransition } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { selectCharacterAndPalette, toggleReady, startGame, leaveLobby, kickPlayer, addCpuPlayer, getRoomPlayers } from "../_actions/lobby";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Check, Play, LogOut, Copy, Share2, CheckCheck, UserX, Bot, Loader2, Eye, Film } from "lucide-react";
import { PixelSprite } from "@/app/_components/PixelSprite";
import { CharacterShowcaseModal } from "./CharacterShowcaseModal";
import { getCharacterMedia } from "@/lib/character-meta";

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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showcaseChar, setShowcaseChar] = useState<CharacterData | null>(null);
  
  const [isPendingReady, startReadyTransition] = useTransition();
  const [isPendingPick, startPickTransition] = useTransition();
  const [isPendingStart, startStartTransition] = useTransition();
  const [isPendingCpu, startCpuTransition] = useTransition();

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

  const syncFreshPlayers = async () => {
    try {
      const res = await getRoomPlayers(roomCode);
      if (res?.success && Array.isArray(res.players)) {
        setPlayers(res.players as any);
      }
    } catch (err) {
      console.warn("syncFreshPlayers warning:", err);
    }
  };

  useEffect(() => {
    const channelName = `presence-room-${roomCode}`;
    
    // Bind pusher error to prevent raw error popup
    pusherClient.connection.bind("error", (err: any) => {
      console.warn("Pusher connection warning:", err);
    });

    const channel = pusherClient.subscribe(channelName);

    // Live update triggers with instant local state sync
    channel.bind("player-joined", (data: any) => {
      if (data?.userId && data?.name) {
        setPlayers((prev) => {
          if (prev.some((p) => p.userId === data.userId)) return prev;
          return [
            ...prev,
            {
              id: data.userId,
              userId: data.userId,
              characterId: data.characterId || "dawn",
              cosmeticVariant: data.cosmeticVariant || "default",
              isReady: data.userId.startsWith("cpu_"),
              user: {
                name: data.name,
                nickname: data.nickname || data.name,
                image: data.avatarUrl || null,
                avatarUrl: data.avatarUrl || null,
              },
            },
          ];
        });
      }
      syncFreshPlayers();
    });

    channel.bind("player-left", (data: any) => {
      if (data?.userId) {
        setPlayers((prev) => prev.filter((p) => p.userId !== data.userId));
      }
      syncFreshPlayers();
    });

    channel.bind("player-picked-character", (data: any) => {
      if (data?.userId && data?.characterId) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.userId === data.userId
              ? { ...p, characterId: data.characterId, cosmeticVariant: data.cosmeticVariant || "default" }
              : p
          )
        );
      }
      syncFreshPlayers();
    });

    channel.bind("player-ready", (data: any) => {
      if (data?.userId !== undefined) {
        setPlayers((prev) =>
          prev.map((p) => (p.userId === data.userId ? { ...p, isReady: data.isReady } : p))
        );
      }
      syncFreshPlayers();
    });

    channel.bind("game-started", () => {
      router.push(`/room/${roomCode}/play`);
    });

    // Initial sync and fast background interval every 2 seconds
    syncFreshPlayers();
    const syncInterval = setInterval(() => {
      syncFreshPlayers();
    }, 2000);

    return () => {
      pusherClient.unsubscribe(channelName);
      clearInterval(syncInterval);
    };
  }, [roomCode, router]);

  // Handle character choice with Instant 0ms Optimistic UI update
  const handlePickCharacter = (charId: string, palette: string = "default") => {
    if (isReady && !isHost) return; // Cannot change while ready (except host)
    setError(null);

    // Instant 0ms local state feedback for responsive UX
    setSelectedChar(charId);
    setSelectedPalette(palette);

    startPickTransition(async () => {
      const res = await selectCharacterAndPalette(roomCode, charId, palette);
      if (res?.error) {
        setError(res.error);
        // Revert on server error
        if (selfPlayer) {
          setSelectedChar(selfPlayer.characterId);
          setSelectedPalette(selfPlayer.cosmeticVariant);
        }
      } else {
        syncFreshPlayers();
      }
    });
  };

  const handleReadyToggle = () => {
    setError(null);
    const nextReady = !isReady;

    // Instant 0ms Optimistic UI local feedback
    setPlayers((prev) =>
      prev.map((p) => (p.userId === currentUserId ? { ...p, isReady: nextReady } : p))
    );

    startReadyTransition(async () => {
      const res = await toggleReady(roomCode, nextReady);
      if (res?.error) {
        setError(res.error);
        // Revert optimistic update on server error
        setPlayers((prev) =>
          prev.map((p) => (p.userId === currentUserId ? { ...p, isReady: isReady } : p))
        );
      } else {
        syncFreshPlayers();
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

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/room/${roomCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/room/${roomCode}`;
      const text = `Ayo main Ular Tangga PixelAscend bersamaku! Kode Room: ${roomCode}. Masuk lewat link ini: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const handleAddCpu = () => {
    setError(null);
    startCpuTransition(async () => {
      const res = await addCpuPlayer(roomCode);
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#4B4A57]/20 pb-4">
          <div className="flex flex-col gap-1">
            <span className="font-press-start text-[10px] text-[#E8A33D]">LOBBY ROOM: {roomCode}</span>
            <h1 className="text-xl sm:text-2xl font-bold font-sans">Pilih Karakter & Kosmetik</h1>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3 py-2 bg-[#1B1A1F] hover:bg-[#4B4A57]/40 text-[#F2E9D8] rounded border border-[#4B4A57]/40 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-[#5FA35A]" /> : <Copy className="w-3.5 h-3.5 text-[#E8A33D]" />}
              <span>{copied ? "Tersalin!" : "Salin Link"}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-none px-3 py-2 bg-[#5FA35A]/10 hover:bg-[#5FA35A]/20 text-[#5FA35A] rounded border border-[#5FA35A]/30 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Character grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {charactersList.map((char) => {
            const isTakenByOther = players.some(
              (p) => p.characterId === char.id && p.userId !== currentUserId
            );
            const isSelected = selectedChar === char.id;
            const charMedia = getCharacterMedia(char.id);

            return (
              <div
                key={char.id}
                className={`p-3 bg-[#1B1A1F] border-2 rounded flex flex-col items-center justify-between gap-2 transition-all relative overflow-hidden group ${
                  isSelected 
                    ? "border-[#E8A33D] shadow-[0_0_10px_rgba(232,163,61,0.2)]" 
                    : isTakenByOther 
                    ? "opacity-40 border-transparent" 
                    : "border-transparent hover:border-[#4B4A57]"
                }`}
              >
                {/* Showcase POV & Video Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowcaseChar(char);
                  }}
                  className="absolute top-1.5 right-1.5 z-20 p-1 bg-[#232129]/90 hover:bg-[#E8A33D] hover:text-[#1B1A1F] text-[#F2E9D8] rounded border border-[#4B4A57] transition-all"
                  title="Lihat Video Animasi MP4 & POV Portrait"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => !isTakenByOther && handlePickCharacter(char.id, selectedPalette)}
                  disabled={isTakenByOther || (isReady && !isHost)}
                  className="w-full flex flex-col items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {/* Character preview animated sprite representation */}
                  <PixelSprite characterId={char.id} direction="down" isWalking={isSelected} size={48} />

                  <div className="flex flex-col items-center text-center gap-0.5">
                    <span className="text-xs font-bold leading-tight font-sans text-[#F2E9D8] truncate max-w-[100px]">
                      {char.name.split(" — ")[0]}
                    </span>
                    <span className="text-[9px] text-[#F2E9D8]/40 font-mono">
                      {char.role}
                    </span>
                  </div>
                </button>

                {isTakenByOther && (
                  <div className="absolute inset-0 bg-[#C24A4A]/10 flex items-center justify-center pointer-events-none">
                    <span className="bg-[#C24A4A] text-white text-[8px] font-press-start px-2 py-0.5 rounded">TAKEN</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected character detail, video preview badge & color palette swapper */}
        {activeCharData && (
          <div className="bg-[#1B1A1F] rounded p-6 border border-[#4B4A57]/20 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Live MP4 Video Preview Badge with POV Poster Fallback */}
              <div className="relative group cursor-pointer" onClick={() => setShowcaseChar(activeCharData)}>
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#E8A33D] bg-[#1B1A1F] shadow-lg relative">
                  <Image
                    src={getCharacterMedia(activeCharData.id).povImage}
                    alt={activeCharData.name}
                    fill
                    className="object-cover opacity-90"
                    unoptimized
                  />
                  <video
                    src={getCharacterMedia(activeCharData.id).walkVideo}
                    poster={getCharacterMedia(activeCharData.id).povImage}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-10 opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="absolute -bottom-2 inset-x-0 flex justify-center z-20">
                  <span className="bg-[#E8A33D] text-[#1B1A1F] text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow">
                    <Film className="w-2.5 h-2.5" /> MP4 SHOWCASE
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-sm font-press-start text-[#E8A33D]">
                    {activeCharData.name}
                  </span>
                  <button
                    onClick={() => setShowcaseChar(activeCharData)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#232129] hover:bg-[#4B4A57]/60 text-[#E8A33D] border border-[#E8A33D]/40 rounded text-xs font-mono transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Full Video & POV
                  </button>
                </div>
                <span className="text-xs text-[#F2E9D8]/60 font-mono">
                  Ability: <span className="text-[#5FA35A] font-bold">{activeCharData.abilityName}</span>
                </span>
                <p className="text-xs text-[#F2E9D8]/80 leading-relaxed max-w-xl">
                  {activeCharData.abilityDesc}
                </p>
              </div>
            </div>

            {/* Customization: Color Swatch Palette Swapper */}
            <div className="flex flex-col gap-3 pt-4 border-t border-[#4B4A57]/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-press-start text-[#E8A33D]">Varian Warna Outfit</span>
                <span className="text-[10px] font-mono text-[#F2E9D8]/50 uppercase">Aktif: {selectedPalette}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "default", label: "Default", color: "#E8A33D", bgClass: "bg-[#E8A33D]" },
                  { id: "crimson", label: "Crimson Red", color: "#C24A4A", bgClass: "bg-[#C24A4A]" },
                  { id: "moss", label: "Moss Green", color: "#5FA35A", bgClass: "bg-[#5FA35A]" },
                  { id: "azure", label: "Azure Blue", color: "#3DA8E8", bgClass: "bg-[#3DA8E8]" },
                ].map((p) => {
                  const isSelected = selectedPalette === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePickCharacter(selectedChar, p.id)}
                      disabled={isReady}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer min-h-[44px] ${
                        isSelected
                          ? "border-[#E8A33D] bg-[#E8A33D]/15 text-white shadow-[0_0_10px_rgba(232,163,61,0.3)]"
                          : "border-[#4B4A57]/30 bg-[#232129] text-[#F2E9D8]/60 hover:border-[#4B4A57] hover:text-white"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${p.bgClass} shrink-0 border border-black/40 shadow-sm`} />
                      <span className="truncate font-bold">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-[#E8A33D]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: Lobby Players Presence (4 columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6 bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#4B4A57]/20 pb-4">
          <h2 className="font-press-start text-xs text-[#F2E9D8]">PLAYER LIST</h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#F2E9D8]/50">({players.length}/8)</span>
            {isHost && players.length < 8 && (
              <button
                onClick={handleAddCpu}
                disabled={isPendingCpu}
                className="px-2 py-1 bg-[#5FA35A]/20 hover:bg-[#5FA35A]/30 text-[#5FA35A] border border-[#5FA35A]/40 rounded text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Tambah Pemain Komputer CPU"
              >
                {isPendingCpu ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
                <span>+ CPU</span>
              </button>
            )}
          </div>
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
                        <span className="text-[8px] px-1 bg-[#E8A33D]/20 text-[#E8A33D] rounded border border-[#E8A33D]/30 font-press-start">HOST</span>
                      )}
                      {player.userId.startsWith("cpu_") && (
                        <span className="text-[8px] px-1 bg-[#5FA35A]/20 text-[#5FA35A] rounded border border-[#5FA35A]/30 font-press-start flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" /> BOT
                        </span>
                      )}
                    </span>
                    <span className="text-[8px] text-[#F2E9D8]/40">
                      Char: {player.characterId.toUpperCase()} ({player.cosmeticVariant})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isHost && !isPlayerHost && (
                    <button
                      onClick={async () => {
                        const res = await kickPlayer(roomCode, player.userId);
                        if (res?.error) setError(res.error);
                      }}
                      className="p-1 text-[#C24A4A]/60 hover:text-[#C24A4A] transition-colors cursor-pointer"
                      title="Kick Player"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}

                  {player.isReady || isPlayerHost ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#5FA35A] font-bold bg-[#5FA35A]/10 px-2 py-0.5 rounded border border-[#5FA35A]/20">
                      <Check className="w-3 h-3" />
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
              <div className="flex-1 flex gap-2">
                {players.length < 8 && (
                  <button
                    onClick={handleAddCpu}
                    disabled={isPendingCpu}
                    className="px-3 h-12 flex items-center justify-center gap-1.5 bg-[#5FA35A]/20 hover:bg-[#5FA35A]/30 text-[#5FA35A] border border-[#5FA35A]/40 rounded font-mono text-xs cursor-pointer transition-colors disabled:opacity-50"
                    title="Tambah Bot CPU ke room"
                  >
                    {isPendingCpu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    <span>+ BOT CPU</span>
                  </button>
                )}
                <button
                  onClick={handleStartGame}
                  disabled={isPendingStart || players.length < 2 || !players.every(p => p.isReady || p.userId === hostUserId || p.userId.startsWith("cpu_"))}
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs rounded transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  MULAI PERMAINAN
                </button>
              </div>
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

      {/* Character Video & POV Showcase Modal */}
      <CharacterShowcaseModal
        isOpen={!!showcaseChar}
        character={showcaseChar}
        onClose={() => setShowcaseChar(null)}
      />
    </div>
  );
}
