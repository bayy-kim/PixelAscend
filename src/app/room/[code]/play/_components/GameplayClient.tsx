"use client";

import { useEffect, useState, useTransition } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { rollDice, executeActionCard, sendEmote, rematchRoom } from "../../_actions/gameplay";
import { BoardRenderer2D, ActiveEmote } from "./BoardRenderer2D";
import { BOARD_LAYOUT } from "@/lib/game/board";
import { sounds, triggerHaptic } from "@/lib/audio-haptics";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Skull, Dices, ChevronRight, Zap, ArrowUp, Volume2, VolumeX, RotateCcw, Smile, Loader2 } from "lucide-react";

interface PlayerData {
  userId: string;
  characterId: string;
  cosmeticVariant: string;
  position: number;
  isReady: boolean;
  heldCards: string[]; // array of action card IDs
  usedAbility: boolean;
  isWinner: boolean;
  turnOrder: number;
  user: {
    name: string;
    nickname: string | null;
    image: string | null;
    avatarUrl: string | null;
  };
}

interface GameplayClientProps {
  roomCode: string;
  currentUserId: string;
  initialPlayers: PlayerData[];
  currentTurnIndex: number;
  status: string;
}

export default function GameplayClient({
  roomCode,
  currentUserId,
  initialPlayers,
  currentTurnIndex: initialTurnIndex,
  status: initialStatus,
}: GameplayClientProps) {
  const router = useRouter();
  
  const [players, setPlayers] = useState<PlayerData[]>(initialPlayers);
  const [turnIndex, setTurnIndex] = useState<number>(initialTurnIndex);
  const [status, setStatus] = useState<string>(initialStatus);
  const [isPendingRoll, startRollTransition] = useTransition();

  // Animation, Audio & Cutscene states
  const [isRolling, setIsRolling] = useState(false);
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [modifierValue, setModifierValue] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [turnTimer, setTurnTimer] = useState<number>(15);
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [activeCutscene, setActiveCutscene] = useState<{
    type: "hazard" | "boost" | "event" | "powerup" | "victory";
    title: string;
    message: string;
  } | null>(null);

  // Determine active turn player
  const sortedPlayers = [...players].sort((a, b) => a.turnOrder - b.turnOrder);
  const activeTurnPlayer = sortedPlayers[turnIndex];
  const isMyTurn = activeTurnPlayer?.userId === currentUserId;

  // Turn Timer 15s Countdown with Auto-Roll AFK Fallback
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    setTurnTimer(15);
    const interval = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto roll if current turn player is AFK
          if (isMyTurn && !isRolling && !isPendingRoll) {
            handleRoll();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [turnIndex, status, isMyTurn]);

  // Haptic & Sound notification when turn changes to user
  useEffect(() => {
    if (isMyTurn) {
      triggerHaptic("turn");
    }
  }, [isMyTurn]);

  useEffect(() => {
    const channelName = `presence-room-${roomCode}`;

    pusherClient.connection.bind("error", (err: any) => {
      console.warn("Pusher connection warning:", err);
    });

    const channel = pusherClient.subscribe(channelName);

    // Real-time player emote handler
    channel.bind("player-emote", (data: any) => {
      const emoteObj: ActiveEmote = {
        id: Math.random().toString(),
        userId: data.userId,
        characterId: data.characterId,
        emote: data.emote,
      };
      setActiveEmotes((prev) => [...prev, emoteObj]);
      setTimeout(() => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== emoteObj.id));
      }, 3000);
    });

    // Real-time card used handler
    channel.bind("card-used", (data: any) => {
      sounds.playBoost();
      triggerHaptic("medium");
      router.refresh();
    });

    // Real-time room rematched handler
    channel.bind("room-rematched", () => {
      router.push(`/room/${roomCode}`);
    });

    // Turn resolved handler
    channel.bind("turn-resolved", (data: any) => {
      // 1. Play dice roll animation & sound first
      setIsRolling(true);
      setRolledValue(data.diceRoll);
      setModifierValue(data.rollModifier);
      sounds.playDiceRoll();
      triggerHaptic("light");

      setTimeout(() => {
        setIsRolling(false);
        sounds.playStep();
        
        // 2. Refresh database data model locally
        router.refresh();

        // 3. Play cutscenes based on target tile effect triggered
        if (data.effectTriggered) {
          const fx = data.effectTriggered;
          if (fx.type === "hazard") {
            sounds.playHazard();
            triggerHaptic("hazard");
          } else if (fx.type === "boost") {
            sounds.playBoost();
            triggerHaptic("medium");
          }

          setActiveCutscene({
            type: fx.type,
            title: fx.name,
            message: fx.description,
          });
          
          // Clear cutscene overlay automatically after 2.5s
          setTimeout(() => {
            setActiveCutscene(null);
          }, 2500);
        }

        // 4. Update local state turns
        setTurnIndex(data.nextTurnIndex);
        if (data.winnerUserId) {
          setStatus("FINISHED");
          sounds.playVictory();
          triggerHaptic("heavy");
          setActiveCutscene({
            type: "victory",
            title: "VICTORY SUMMIT 100",
            message: `Pemain ${data.winnerUserId === currentUserId ? "KAMU" : "Lawan"} mencapai puncak dan memenangkan permainan!`,
          });
        }
      }, 1200); // 1.2s dice roll loop duration
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [roomCode, router, currentUserId]);

  // Handle server actions trigger
  const handleRoll = () => {
    if (isRolling || isPendingRoll) return;
    triggerHaptic("light");

    startRollTransition(async () => {
      const res = await rollDice(roomCode);
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleSendEmote = async (emote: string) => {
    triggerHaptic("light");
    await sendEmote(roomCode, emote);
  };

  const handleUseCard = async (cardId: string, targetUserId?: string) => {
    if (cardId === "swap" && !targetUserId) {
      setShowSwapModal(true);
      return;
    }

    const res = await executeActionCard(roomCode, cardId, targetUserId);
    if (res?.error) {
      alert(res.error);
    } else {
      setShowSwapModal(false);
    }
  };

  const handleRematch = async () => {
    const res = await rematchRoom(roomCode);
    if (res?.error) alert(res.error);
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto px-4 py-6 relative">
      {/* Cutscene overlay alert */}
      {activeCutscene && (
        <div className="fixed inset-0 bg-[#1B1A1F]/90 z-50 flex flex-col items-center justify-center text-center p-6 backdrop-blur animate-fade-in">
          <div className="max-w-md bg-[#232129] border-4 border-[#E8A33D] p-8 rounded-lg flex flex-col items-center gap-6 shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A33D]/5 rounded-full blur-3xl"></div>
            
            {activeCutscene.type === "hazard" && (
              <div className="w-16 h-16 bg-[#7C4DA8]/20 rounded border-2 border-[#7C4DA8] flex items-center justify-center animate-bounce">
                <Skull className="w-8 h-8 text-[#7C4DA8]" />
              </div>
            )}
            {activeCutscene.type === "boost" && (
              <div className="w-16 h-16 bg-[#5FA35A]/20 rounded border-2 border-[#5FA35A] flex items-center justify-center animate-bounce">
                <ArrowUp className="w-8 h-8 text-[#5FA35A]" />
              </div>
            )}
            {activeCutscene.type === "victory" && (
              <div className="w-16 h-16 bg-[#E8A33D]/20 rounded border-2 border-[#E8A33D] flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-[#E8A33D]" />
              </div>
            )}

            <h2 className="font-press-start text-sm md:text-base text-[#E8A33D] tracking-wider uppercase">
              {activeCutscene.title}
            </h2>
            <p className="text-sm font-sans leading-relaxed text-[#F2E9D8]">
              {activeCutscene.message}
            </p>
          </div>
        </div>
      )}

      {/* 2D Pixel Board View (8 columns) */}
      <div className="lg:col-span-8 flex flex-col items-center justify-center w-full relative">
        {/* Quick Emote Bar Overlay (Top of board) */}
        <div className="w-full max-w-[100vw] sm:max-w-[500px] flex flex-wrap items-center justify-between bg-[#232129] border border-[#4B4A57]/40 px-2 sm:px-3 py-1.5 rounded-t-lg mb-1 gap-1">
          <div className="flex items-center gap-1 text-[11px] text-[#E8A33D] font-mono">
            <Smile className="w-3.5 h-3.5" /> Emotes:
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {["GG! 🔥", "Oops 😅", "Lucky! 🍀", "Taunt 😈"].map((emo) => (
              <button
                key={emo}
                onClick={() => handleSendEmote(emo)}
                className="px-2 py-1 bg-[#1B1A1F] hover:bg-[#4B4A57]/40 text-[#F2E9D8] text-[10px] font-mono rounded border border-[#4B4A57]/30 transition-colors active:scale-95 min-h-[32px]"
              >
                {emo}
              </button>
            ))}
          </div>
          <button
            onClick={toggleSound}
            className="p-1.5 text-[#F2E9D8]/60 hover:text-[#E8A33D] transition-colors min-h-[32px] flex items-center justify-center"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <BoardRenderer2D
          boardLayout={Object.entries(BOARD_LAYOUT).map(([k, v]) => ({
            ...v,
            tileNumber: Number(k),
          }))}
          players={players.map((p) => ({
            userId: p.userId,
            name: p.user.nickname || p.user.name,
            characterId: p.characterId,
            position: p.position,
            isCurrentTurn: p.userId === activeTurnPlayer?.userId,
          }))}
          currentTurnUserId={activeTurnPlayer?.userId}
          activeEmotes={activeEmotes}
          onSkipCutscene={() => setActiveCutscene(null)}
          activeCutscene={
            activeCutscene
              ? {
                  type:
                    activeCutscene.type === "hazard"
                      ? "hazard"
                      : activeCutscene.type === "boost"
                      ? "boost"
                      : activeCutscene.type === "victory"
                      ? "victory"
                      : null,
                  message: activeCutscene.message,
                }
              : undefined
          }
        />
      </div>

      {/* Controller & Players turns sidebar (4 columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Action Cards & Ability Quick Menu */}
        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#4B4A57]/30 pb-3">
            <span className="font-press-start text-xs text-[#E8A33D] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E8A33D]" /> CARDS &amp; ABILITIES
            </span>
          </div>

          {/* Player Held Cards */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono text-[#F2E9D8]/60">Hand Cards:</span>
            {sortedPlayers.find((p) => p.userId === currentUserId)?.heldCards.length ? (
              <div className="flex flex-wrap gap-2">
                {sortedPlayers
                  .find((p) => p.userId === currentUserId)
                  ?.heldCards.map((cardId, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseCard(cardId)}
                      className="px-3 py-1.5 bg-[#E8A33D]/10 hover:bg-[#E8A33D]/20 border border-[#E8A33D]/40 rounded text-xs font-mono text-[#E8A33D] flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95 min-h-[36px]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span className="capitalize">{cardId}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <span className="text-xs font-mono text-[#F2E9D8]/40 italic">Tidak ada kartu di tangan</span>
            )}
          </div>
        </div>

        {/* Dice Roller section */}
        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col items-center justify-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A33D]/5 rounded-full blur-2xl"></div>

          {/* Turn Resolution Info & Timer */}
          <div className="flex flex-col items-center text-center gap-2 w-full">
            <div className="flex items-center justify-between w-full px-2">
              <span className="font-press-start text-[9px] text-[#F2E9D8]/40 tracking-wider">TURN TIMER</span>
              <span className={`font-mono text-xs font-bold ${turnTimer <= 5 ? "text-[#C24A4A] animate-pulse" : "text-[#E8A33D]"}`}>
                00:{turnTimer < 10 ? `0${turnTimer}` : turnTimer}
              </span>
            </div>

            {/* Turn Timer Progress Bar */}
            <div className="w-full bg-[#1B1A1F] h-1.5 rounded-full overflow-hidden border border-[#4B4A57]/30">
              <div
                className={`h-full transition-all duration-1000 ${
                  turnTimer <= 5 ? "bg-[#C24A4A]" : "bg-[#E8A33D]"
                }`}
                style={{ width: `${(turnTimer / 15) * 100}%` }}
              />
            </div>

            <span className="text-sm font-bold text-[#F2E9D8] mt-1">
              {isMyTurn ? "Giliranmu sekarang!" : `Menunggu giliran ${activeTurnPlayer?.user.nickname || activeTurnPlayer?.user.name}...`}
            </span>
          </div>

          {/* 3D-ish animated dice box */}
          <div className="w-20 h-20 bg-[#1B1A1F] border-2 border-[#4B4A57] rounded flex items-center justify-center relative overflow-hidden shadow-lg">
            {isRolling ? (
              <div className="animate-spin duration-300">
                <Dices className="w-10 h-10 text-[#E8A33D] opacity-80" />
              </div>
            ) : rolledValue ? (
              <div className="flex flex-col items-center">
                <span className="font-press-start text-3xl font-bold text-[#E8A33D] animate-pulse">
                  {rolledValue}
                </span>
                {modifierValue > 0 && (
                  <span className="text-[9px] font-mono text-[#5FA35A] font-bold">+{modifierValue} modifier</span>
                )}
              </div>
            ) : (
              <Dices className="w-8 h-8 text-[#F2E9D8]/20" />
            )}
          </div>

          {/* Roll CTA Button */}
          {status === "IN_PROGRESS" && (
            <button
              onClick={handleRoll}
              disabled={!isMyTurn || isRolling || isPendingRoll}
              className={`w-full h-14 flex items-center justify-center gap-3 font-press-start text-xs tracking-wider rounded-md border-b-4 border-[#4B4A57] transition-all cursor-pointer shadow-lg ${
                isMyTurn && !isRolling && !isPendingRoll
                  ? "bg-[#E8A33D] hover:bg-[#F2B75C] text-[#1B1A1F]"
                  : "bg-[#232129] border border-[#4B4A57]/30 text-[#F2E9D8]/20 cursor-not-allowed border-b-0"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {isPendingRoll || isRolling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1B1A1F]" />
                  <span>MENGOKOK...</span>
                </>
              ) : (
                <>
                  <Dices className="w-4 h-4" />
                  <span>KOCOK DADU</span>
                </>
              )}
            </button>
          )}

          {/* Rematch Button when FINISHED */}
          {status === "FINISHED" && (
            <button
              onClick={handleRematch}
              className="w-full h-14 flex items-center justify-center gap-3 bg-[#5FA35A] hover:bg-[#6EB668] text-[#1B1A1F] font-press-start text-xs tracking-wider rounded-md border-b-4 border-[#3D6B39] transition-all cursor-pointer shadow-lg active:translate-y-[2px]"
            >
              <RotateCcw className="w-4 h-4" /> MAIN LAGI (REMATCH)
            </button>
          )}
        </div>

        {/* Room Players summary & standings */}
        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#4B4A57]/20 pb-3">
            <ChevronRight className="w-5 h-5 text-[#E8A33D]" />
            <span className="font-press-start text-xs text-[#F2E9D8]">Turn Standings</span>
          </div>

          <div className="flex flex-col gap-3">
            {sortedPlayers.map((player, index) => {
              const isActive = index === turnIndex;
              
              return (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-3 rounded font-mono text-xs border transition-all ${
                    isActive
                      ? "border-[#E8A33D] bg-[#E8A33D]/10"
                      : "border-[#4B4A57]/10 bg-[#1B1A1F]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-[#4B4A57]/20 flex items-center justify-center text-[10px] text-[#F2E9D8]/50">
                      {index + 1}
                    </span>
                    <span className={`font-bold ${isActive ? "text-[#E8A33D]" : "text-[#F2E9D8]"}`}>
                      {player.user.nickname || player.user.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-press-start text-[10px]">
                    <span className="text-[#5FA35A]">TILE {player.position}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Player Swap Card Selection Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-[#1B1A1F]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#232129] border-2 border-[#E8A33D] rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex flex-col gap-1">
              <span className="font-press-start text-xs text-[#E8A33D]">SWAP ACTION CARD</span>
              <p className="text-xs text-[#F2E9D8]/70 font-mono">Pilih pemain lawan untuk bertukar posisi tile secara instan:</p>
            </div>

            <div className="flex flex-col gap-2">
              {players
                .filter((p) => p.userId !== currentUserId)
                .map((p) => (
                  <button
                    key={p.userId}
                    onClick={() => handleUseCard("swap", p.userId)}
                    className="w-full p-3 bg-[#1B1A1F] hover:bg-[#E8A33D]/10 border border-[#4B4A57]/30 hover:border-[#E8A33D]/60 rounded text-xs font-mono text-left flex items-center justify-between text-[#F2E9D8] transition-colors cursor-pointer"
                  >
                    <span className="font-bold">{p.user.nickname || p.user.name}</span>
                    <span className="text-[10px] text-[#5FA35A] font-press-start">TILE {p.position}</span>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowSwapModal(false)}
              className="mt-2 w-full py-2 bg-[#4B4A57]/20 hover:bg-[#4B4A57]/40 text-[#F2E9D8]/60 text-xs font-mono rounded border border-[#4B4A57]/30 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
