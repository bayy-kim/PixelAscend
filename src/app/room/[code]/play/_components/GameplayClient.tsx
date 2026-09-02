"use client";

import { useEffect, useState, useTransition } from "react";
import { pusherClient } from "@/lib/pusher-client";
import {
  rollDice,
  executeActionCard,
  sendEmote,
  rematchRoom,
  armGuardiansWard,
  rollDicePreview,
  executeForesightReroll,
  armVanish,
  executeSwiftStride,
  executeCpuTurn,
} from "../../_actions/gameplay";
import { BoardRenderer2D, ActiveEmote } from "./BoardRenderer2D";
import { BOARD_LAYOUT } from "@/lib/game/board";
import { sounds, triggerHaptic } from "@/lib/audio-haptics";
import { getCharacterMedia } from "@/lib/character-meta";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Skull, Dices, ChevronRight, Zap, ArrowUp, Volume2, VolumeX, RotateCcw, Smile, Loader2, Trophy, Bot } from "lucide-react";

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
  const [turnActionCounter, setTurnActionCounter] = useState<number>(0);
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  // Foresight state for Wren
  const [wrenPreviewRoll, setWrenPreviewRoll] = useState<number | null>(null);
  const [showSwiftStrideModal, setShowSwiftStrideModal] = useState(false);
  const [activeCutscene, setActiveCutscene] = useState<{
    type: "hazard" | "boost" | "event" | "powerup" | "victory";
    title: string;
    message: string;
  } | null>(null);

  // Determine active turn player & self player
  const sortedPlayers = [...players].sort((a, b) => a.turnOrder - b.turnOrder);
  const activeTurnPlayer = sortedPlayers[turnIndex];
  const selfPlayer = players.find((p) => p.userId === currentUserId);
  const isMyTurn = activeTurnPlayer?.userId === currentUserId;

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
  }, [turnIndex, turnActionCounter, status, isMyTurn]);

  // CPU Computer Automatic Turn Handler (If active turn player is CPU, Host triggers roll automatically after 1.2s delay)
  const isHost = currentUserId === sortedPlayers[0]?.userId;
  const isCpuTurn = activeTurnPlayer?.userId?.startsWith("cpu_");

  useEffect(() => {
    if (status !== "IN_PROGRESS" || !isCpuTurn || !isHost || isRolling || isPendingRoll) return;

    const timer = setTimeout(() => {
      startRollTransition(async () => {
        const res = await executeCpuTurn(roomCode);
        if (res?.error) console.warn("CPU roll warning:", res.error);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [turnIndex, turnActionCounter, status, isCpuTurn, isHost, isRolling, isPendingRoll, roomCode]);

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

    channel.bind("card-used", (data: any) => {
      sounds.playBoost();
      triggerHaptic("medium");
      
      // Optimitically update held cards or positions if present in event
      if (data.userId && data.cardId) {
        setPlayers((prev) => 
          prev.map((p) => {
            if (p.userId === data.userId) {
              return { ...p, heldCards: p.heldCards.filter((c) => c !== data.cardId) };
            }
            return p;
          })
        );
      }
      if (data.swappedPositions) {
        setPlayers((prev) => 
          prev.map((p) => {
            const swapInfo = data.swappedPositions.find((sp: any) => sp.userId === p.userId);
            if (swapInfo) return { ...p, position: swapInfo.position };
            return p;
          })
        );
      }
    });

    // Real-time room rematched handler
    channel.bind("room-rematched", () => {
      router.push(`/room/${roomCode}`);
    });

    // Turn resolved handler
    channel.bind("turn-resolved", (data: any) => {
      // 1. Play dice roll animation & sound first
      setIsRolling(true);
      
      // Spinner / Dice animation logic
      let currentFace = 1;
      const diceInterval = setInterval(() => {
        currentFace = currentFace >= 6 ? 1 : currentFace + 1;
        setRolledValue(currentFace);
      }, 100);

      sounds.playDiceRoll();
      triggerHaptic("light");

      setTimeout(() => {
        clearInterval(diceInterval);
        setIsRolling(false);
        setRolledValue(data.diceRoll);
        setModifierValue(data.rollModifier);
        sounds.playStep();

        // 2. Update player position optimistically in local state to prevent loading flash
        setPlayers((prev) =>
          prev.map((p) =>
            p.userId === data.userId
              ? { ...p, position: data.finalPosition, heldCards: data.cardDrawn ? [...p.heldCards, data.cardDrawn] : p.heldCards }
              : p
          )
        );

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

        // 4. Handle Extra Turn (Dice 6) or Creeping Fog skip turn toast notification
        if (data.isExtraTurn) {
          setActiveCutscene({
            type: "boost",
            title: "LUCKY 6! EXTRA TURN",
            message: `${activeTurnPlayer?.user.nickname || activeTurnPlayer?.user.name} mendapat dadu 6! Dapat giliran melempar dadu lagi!`,
          });
          setTimeout(() => setActiveCutscene(null), 2000);
        } else if (data.turnSkipped) {
          setActiveCutscene({
            type: "hazard",
            title: "CREEPING FOG",
            message: `Giliran ${activeTurnPlayer?.user.nickname || activeTurnPlayer?.user.name} dilewati karena efek Creeping Fog!`,
          });
          setTimeout(() => setActiveCutscene(null), 2000);
        }

        // 5. Update local state turns and trigger auto-roll counters
        setTurnIndex(data.nextTurnIndex);
        setTurnActionCounter((prev) => prev + 1);
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

    // Fallback automatic background refresh every 3 seconds so manual refresh is NEVER required
    const syncInterval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => {
      pusherClient.unsubscribe(channelName);
      clearInterval(syncInterval);
    };
  }, [roomCode, router, currentUserId]);

  // Handle server actions trigger
  const handleWrenPreview = async () => {
    const res = await rollDicePreview(roomCode);
    if (res?.error) {
      alert(res.error);
    } else if (res?.diceRoll) {
      setWrenPreviewRoll(res.diceRoll);
    }
  };

  const handleWrenForesightReroll = async () => {
    const res = await executeForesightReroll(roomCode);
    if (res?.error) {
      alert(res.error);
    } else if (res?.diceRoll) {
      setWrenPreviewRoll(res.diceRoll);
    }
  };

  const handleWrenAcceptRoll = () => {
    setWrenPreviewRoll(null);
    handleRoll();
  };

  const handleArmDawn = async () => {
    const res = await armGuardiansWard(roomCode);
    if (res?.error) alert(res.error);
  };

  const handleArmSable = async () => {
    const res = await armVanish(roomCode);
    if (res?.error) alert(res.error);
  };

  const handleHalcyonSwiftStride = async (steps: number) => {
    setShowSwiftStrideModal(false);
    const res = await executeSwiftStride(roomCode, steps);
    if (res?.error) alert(res.error);
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

          {/* Hero Active Abilities Controls */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#4B4A57]/20">
            <span className="text-[11px] font-mono text-[#F2E9D8]/60">Hero Ability:</span>
            {selfPlayer?.characterId === "dawn" && !selfPlayer.usedAbility && (
              <button
                onClick={handleArmDawn}
                className="w-full py-2 bg-[#E8A33D]/20 hover:bg-[#E8A33D]/30 border border-[#E8A33D] rounded text-xs font-mono text-[#E8A33D] font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>{selfPlayer.usedAbility ? "Guardian's Ward (Used)" : "Aktifkan Guardian's Ward"}</span>
              </button>
            )}

            {selfPlayer?.characterId === "sable" && !selfPlayer.usedAbility && (
              <button
                onClick={handleArmSable}
                className="w-full py-2 bg-[#7C4DA8]/20 hover:bg-[#7C4DA8]/30 border border-[#7C4DA8] rounded text-xs font-mono text-purple-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Skull className="w-4 h-4" />
                <span>Aktifkan Vanish (Kebal 1 Ronde)</span>
              </button>
            )}

            {selfPlayer?.characterId === "halcyon" && !selfPlayer.usedAbility && isMyTurn && (
              <button
                onClick={() => setShowSwiftStrideModal(true)}
                className="w-full py-2 bg-[#5FA35A]/20 hover:bg-[#5FA35A]/30 border border-[#5FA35A] rounded text-xs font-mono text-green-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                <span>Swift Stride (Bonus Langkah)</span>
              </button>
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

            <span className="text-sm font-bold text-[#F2E9D8] mt-1 flex items-center justify-center gap-2">
              {isMyTurn ? (
                "Giliranmu sekarang!"
              ) : isCpuTurn ? (
                <>
                  <Bot className="w-4 h-4 text-[#5FA35A] animate-pulse" />
                  <span className="text-[#5FA35A]">🤖 {activeTurnPlayer?.user.nickname || activeTurnPlayer?.user.name} sedang berpikir...</span>
                </>
              ) : (
                `Menunggu giliran ${activeTurnPlayer?.user.nickname || activeTurnPlayer?.user.name}...`
              )}
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
                {rolledValue === 6 && (
                  <span className="text-[9px] font-mono text-[#5FA35A] font-bold animate-bounce">
                    BONUS 6!
                  </span>
                )}
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
            <>
              {selfPlayer?.characterId === "wren" && !selfPlayer.usedAbility && isMyTurn ? (
                wrenPreviewRoll ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="text-center font-mono text-xs text-[#E8A33D] font-bold">
                      Hasil Roll Preview: {wrenPreviewRoll}
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleWrenAcceptRoll}
                        className="flex-1 py-3 bg-[#5FA35A] hover:bg-[#72b86d] text-[#1B1A1F] font-press-start text-[10px] rounded cursor-pointer"
                      >
                        Terima
                      </button>
                      <button
                        onClick={handleWrenForesightReroll}
                        className="flex-1 py-3 bg-[#7C4DA8] hover:bg-[#905fc5] text-white font-press-start text-[10px] rounded cursor-pointer"
                      >
                        Reroll (Foresight)
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleWrenPreview}
                    disabled={isRolling || isPendingRoll}
                    className="w-full h-14 flex items-center justify-center gap-3 bg-[#E8A33D] hover:bg-[#F2B75C] text-[#1B1A1F] font-press-start text-xs rounded-md border-b-4 border-[#4B4A57] cursor-pointer shadow-lg"
                  >
                    <Dices className="w-4 h-4" />
                    <span>PREVIEW ROLL (WREN)</span>
                  </button>
                )
              ) : (
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
                      <span>KOCOK DADU...</span>
                    </>
                  ) : (
                    <>
                      <Dices className="w-4 h-4" />
                      <span>KOCOK DADU</span>
                    </>
                  )}
                </button>
              )}
            </>
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

      {/* Halcyon Swift Stride Bonus Steps Modal */}
      {showSwiftStrideModal && (
        <div className="fixed inset-0 bg-[#1B1A1F]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#232129] border-2 border-[#5FA35A] rounded-xl p-6 flex flex-col gap-4 shadow-2xl text-center">
            <div className="flex flex-col gap-1">
              <span className="font-press-start text-xs text-[#5FA35A]">SWIFT STRIDE (CENTAUR)</span>
              <p className="text-xs text-[#F2E9D8]/70 font-mono">Pilih jumlah bonus tile melangkah tambahan:</p>
            </div>

            <div className="flex gap-3 justify-center">
              {[1, 2, 3].map((steps) => (
                <button
                  key={steps}
                  onClick={() => handleHalcyonSwiftStride(steps)}
                  className="flex-1 py-3 bg-[#5FA35A]/20 hover:bg-[#5FA35A]/40 border border-[#5FA35A] text-[#5FA35A] font-press-start text-sm rounded cursor-pointer transition-colors"
                >
                  +{steps} Tile
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSwiftStrideModal(false)}
              className="mt-2 w-full py-2 bg-[#4B4A57]/20 hover:bg-[#4B4A57]/40 text-[#F2E9D8]/60 text-xs font-mono rounded border border-[#4B4A57]/30 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Victory Showcase Modal with MP4 Video Animation Showcase */}
      {status === "FINISHED" && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1B1A1F] border-2 border-[#E8A33D] rounded-2xl p-6 flex flex-col items-center gap-4 text-center shadow-[0_0_50px_rgba(232,163,61,0.4)] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 text-[#E8A33D]">
              <Trophy className="w-8 h-8 animate-bounce" />
              <h2 className="font-press-start text-lg text-[#E8A33D]">VICTORY SUMMIT!</h2>
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            {(() => {
              const winnerPlayer = sortedPlayers.find((p) => p.position >= 100) || sortedPlayers[0];
              const winnerMedia = getCharacterMedia(winnerPlayer.characterId);

              return (
                <div className="flex flex-col items-center gap-3 w-full">
                  {/* MP4 Walk Cycle Video Showcase Box */}
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border-4 border-[#E8A33D] bg-black shadow-2xl">
                    <video
                      src={winnerMedia.walkVideo}
                      poster={winnerMedia.povImage}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-2">
                      <span className="text-[10px] font-press-start text-[#E8A33D]">
                        {winnerPlayer.user.nickname || winnerPlayer.user.name}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-[#F2E9D8]/80">
                    Selamat! <strong className="text-[#5FA35A]">{winnerPlayer.user.nickname || winnerPlayer.user.name}</strong> berhasil mencapai puncak Tile 100!
                  </p>
                </div>
              );
            })()}

            <div className="flex gap-3 w-full pt-2">
              <button
                onClick={handleRematch}
                className="flex-1 py-3 bg-[#5FA35A] hover:bg-[#6EB668] text-[#1B1A1F] font-press-start text-xs rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> MAIN LAGI
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="py-3 px-4 bg-[#232129] hover:bg-[#4B4A57] text-[#F2E9D8] font-mono text-xs rounded-lg border border-[#4B4A57] transition-all cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
