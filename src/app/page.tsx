import Image from "next/image";
import { auth, signIn } from "@/auth";

export default async function LandingPage() {
  // Check auth session
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen bg-[#1B1A1F] text-[#F2E9D8] select-none">
      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#4B4A57]/30">
        <div className="flex items-center gap-3">
          {/* Logo Icon Placeholder */}
          <div className="w-8 h-8 bg-[#E8A33D] rounded-sm flex items-center justify-center font-press-start text-xs text-[#1B1A1F] font-bold">
            P
          </div>
          <span className="font-press-start text-sm md:text-base tracking-wider text-[#F2E9D8]">
            Pixel<span className="text-[#E8A33D]">Ascend</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          {/* Left Column: Hype Text */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
            <div className="inline-block px-3 py-1 bg-[#7C4DA8]/20 border border-[#7C4DA8]/40 rounded-full text-xs text-[#E8A33D] font-mono uppercase tracking-widest">
              Lobby Multiplayer MVP
            </div>
            <h1 className="font-press-start text-3xl md:text-4xl lg:text-5xl leading-snug tracking-wide text-[#F2E9D8]">
              Daki Puncak <br />
              <span className="text-[#E8A33D] drop-shadow-[0_2px_0_#4B4A57]">Summit 100</span>!
            </h1>
            <p className="text-[#F2E9D8]/80 max-w-xl text-base md:text-lg leading-relaxed font-sans">
              Ular tangga digital bertema RPG fantasi gelap dengan 8 karakter unik, board misterius, dan pertempuran taktis real-time dari HP-mu.
            </p>

            <div className="w-full max-w-xs mt-4">
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="w-full h-14 flex items-center justify-center gap-4 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs tracking-wider rounded-md border-b-4 border-[#4B4A57] transition-all cursor-pointer shadow-lg min-w-[240px] px-6"
                  style={{ touchAction: "manipulation" }}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.823-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.706 0 3.24.673 4.373 1.767l3.122-3.121C18.913 2.148 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.782 0 10.742-4.14 10.742-11.24 0-.673-.06-1.345-.168-1.955H12.24z" />
                  </svg>
                  Sign in with Google
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Visual Preview Card */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-sm bg-[#232129] border-2 border-[#4B4A57]/40 rounded-lg p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A33D]/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center justify-between border-b border-[#4B4A57]/30 pb-4">
                <span className="font-press-start text-xs text-[#E8A33D]">Roster Preview</span>
                <span className="font-mono text-xs text-[#4B4A57]">v1.0.0-mvp</span>
              </div>

              {/* Character grid visual preview (placeholder sprites using visual css blocks) */}
              <div className="grid grid-cols-4 gap-4 py-2">
                {[
                  { name: "Dawn", color: "bg-blue-900 border-blue-400" },
                  { name: "Wren", color: "bg-purple-900 border-purple-400" },
                  { name: "Thistle", color: "bg-amber-900 border-amber-500" },
                  { name: "Brack", color: "bg-green-900 border-green-400" },
                  { name: "Ember", color: "bg-red-950 border-red-500" },
                  { name: "Marrow", color: "bg-zinc-800 border-zinc-400" },
                  { name: "Sable", color: "bg-stone-900 border-stone-500" },
                  { name: "Halcyon", color: "bg-yellow-950 border-yellow-500" },
                ].map((char, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 cursor-help group"
                  >
                    <div className={`w-12 h-12 rounded border-2 ${char.color} flex items-center justify-center text-lg font-bold shadow-md hover:scale-105 transition-transform`}>
                      {char.name[0]}
                    </div>
                    <span className="text-[10px] font-mono text-[#F2E9D8]/60 group-hover:text-[#E8A33D] transition-colors">
                      {char.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#1B1A1F] rounded p-4 border border-[#4B4A57]/20 flex flex-col gap-2">
                <span className="font-press-start text-[9px] text-[#5FA35A]">► ONLINE MULTIPLAYER</span>
                <p className="text-[11px] text-[#F2E9D8]/70 leading-relaxed font-mono">
                  Buat room instan, undang temanmu via kode room, lalu bertarung taktis menggunakan Action Cards & Abilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#4B4A57]/20 py-6 text-center text-xs text-[#F2E9D8]/40 font-mono">
        <p>© 2026 PixelAscend Project. Built for Bayu's Community.</p>
      </footer>
    </div>
  );
}
