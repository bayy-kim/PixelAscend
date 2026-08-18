import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { PixelSprite } from "./_components/PixelSprite";
import { Swords, Users, Sparkles } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  // If already logged in, redirect to dashboard automatically
  if (session?.user) {
    redirect("/dashboard");
  }

  const rosterPreview = [
    { id: "dawn", name: "Dawn", role: "Defense" },
    { id: "wren", name: "Wren", role: "Luck" },
    { id: "thistle", name: "Thistle", role: "Defense" },
    { id: "brack", name: "Brack", role: "Offense" },
    { id: "ember", name: "Ember", role: "Risk/Reward" },
    { id: "marrow", name: "Marrow", role: "Comeback" },
    { id: "sable", name: "Sable", role: "Evasion" },
    { id: "halcyon", name: "Halcyon", role: "Mobility" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#1B1A1F] text-[#F2E9D8] select-none">
      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#4B4A57]/30">
        <div className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="w-8 h-8 bg-[#E8A33D] rounded-sm flex items-center justify-center font-press-start text-xs text-[#1B1A1F] font-bold shadow-md">
            P
          </div>
          <span className="font-press-start text-sm md:text-base tracking-wider text-[#F2E9D8]">
            Pixel<span className="text-[#E8A33D]">Ascend</span>
          </span>
        </div>
        <div className="text-xs font-mono text-[#F2E9D8]/50">
          Wanderer&apos;s Path
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 py-12 w-full gap-16">
        <div className="flex flex-col lg:flex-row gap-12 items-center justify-between w-full">
          {/* Left Column: Hero Hype Text & CTA */}
          <div className="w-full lg:w-7/12 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7C4DA8]/20 border border-[#7C4DA8]/40 rounded-full text-xs text-[#E8A33D] font-mono tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#5FA35A] animate-pulse" />
              Retro Pixel RPG Board Game
            </div>
            
            <h1 className="font-press-start text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-snug tracking-wide text-[#F2E9D8] w-full">
              Daki Puncak <br />
              <span className="text-[#E8A33D] drop-shadow-[0_3px_0_#4B4A57]">Summit 100</span>!
            </h1>

            <p className="text-[#F2E9D8]/80 max-w-xl w-full text-base md:text-lg leading-relaxed font-sans">
              Ular tangga digital bertema chibi pixel art RPG dengan 8 karakter unik, board misterius, dan pertarungan taktis real-time langsung dari HP-mu.
            </p>

            {/* Single CTA: Sign in with Google */}
            <div className="w-full max-w-xs mt-2">
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="w-full min-h-[52px] flex items-center justify-center gap-3 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[2px] text-[#1B1A1F] font-press-start text-xs tracking-wider rounded-md border-b-4 border-[#4B4A57] transition-all cursor-pointer shadow-xl px-6"
                  style={{ touchAction: "manipulation" }}
                >
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.706 0 3.24.673 4.373 1.767l3.122-3.121C18.913 2.148 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.782 0 10.742-4.14 10.742-11.24 0-.673-.06-1.345-.168-1.955H12.24z" />
                  </svg>
                  Sign in with Google
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Pixel Character Roster Card */}
          <div className="w-full lg:w-5/12 flex justify-center">
            <div className="w-full max-w-md bg-[#232129] border-2 border-[#4B4A57]/50 rounded-xl p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A33D]/5 rounded-full blur-3xl" />
              
              <div className="flex items-center justify-between border-b border-[#4B4A57]/40 pb-4">
                <span className="font-press-start text-xs text-[#E8A33D] tracking-wide">Chibi Roster</span>
                <span className="font-mono text-[10px] text-[#F2E9D8]/50">8 Hero Unique</span>
              </div>

              {/* 2D Chibi Pixel Sprites Display */}
              <div className="grid grid-cols-4 gap-3 py-1">
                {rosterPreview.map((char) => (
                  <div
                    key={char.id}
                    className="flex flex-col items-center gap-1.5 p-2 bg-[#1B1A1F]/60 rounded-lg border border-[#4B4A57]/30 hover:border-[#E8A33D]/60 transition-colors group cursor-default"
                  >
                    <PixelSprite
                      characterId={char.id}
                      direction="down"
                      isWalking={true}
                      size={40}
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[11px] font-bold font-sans text-[#F2E9D8] group-hover:text-[#E8A33D] transition-colors truncate max-w-full">
                      {char.name}
                    </span>
                    <span className="text-[9px] font-mono text-[#F2E9D8]/50 truncate max-w-full">
                      {char.role}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#1B1A1F] rounded-lg p-3.5 border border-[#4B4A57]/30 flex items-center justify-between">
                <span className="font-press-start text-[9px] text-[#5FA35A] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#5FA35A]" />
                  SERVER AUTHORITATIVE
                </span>
                <span className="text-[10px] font-mono text-[#F2E9D8]/60">Anti-Cheat System</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Highlight Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#4B4A57]/20">
          <div className="bg-[#232129]/80 border border-[#4B4A57]/30 rounded-xl p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8A33D]/10 border border-[#E8A33D]/30 flex items-center justify-center text-[#E8A33D]">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-press-start text-xs text-[#F2E9D8]">Multiplayer Real-time</h3>
            <p className="font-sans text-sm text-[#F2E9D8]/70 leading-relaxed">
              Main bersama 2–8 pemain secara langsung dari HP masing-masing melalui room lobby dengan sistem terhubung real-time.
            </p>
          </div>

          <div className="bg-[#232129]/80 border border-[#4B4A57]/30 rounded-xl p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#7C4DA8]/20 border border-[#7C4DA8]/40 flex items-center justify-center text-[#7C4DA8]">
              <Swords className="w-5 h-5" />
            </div>
            <h3 className="font-press-start text-xs text-[#F2E9D8]">Abilities &amp; Cards</h3>
            <p className="font-sans text-sm text-[#F2E9D8]/70 leading-relaxed">
              8 Chibi hero dengan skill pasif/aktif unik + Action Cards (Blink, Aegis, Mirror Ward, Swap) untuk membalikkan keadaan.
            </p>
          </div>

          <div className="bg-[#232129]/80 border border-[#4B4A57]/30 rounded-xl p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5FA35A]/20 border border-[#5FA35A]/40 flex items-center justify-center text-[#5FA35A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-press-start text-xs text-[#F2E9D8]">Animasi Chibi Pixel</h3>
            <p className="font-sans text-sm text-[#F2E9D8]/70 leading-relaxed">
              Visual retro pixel-art dengan walk-cycle spritesheet 4×3, efek Shadow Vine hazard, dan Ancient Ladder boost yang hidup.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#4B4A57]/20 py-6 text-center text-xs text-[#F2E9D8]/40 font-mono">
        <p>© 2026 PixelAscend Project. Built for Bayu&apos;s Community.</p>
      </footer>
    </div>
  );
}

