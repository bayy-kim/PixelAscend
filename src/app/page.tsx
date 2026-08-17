import Link from "next/link";
import { auth, signIn } from "@/auth";
import { 
  Swords, 
  Users, 
  Sparkles, 
  Play, 
  ChevronRight, 
  Compass, 
  ShieldAlert, 
  Zap, 
  UserCheck 
} from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  const characters = [
    { name: "Dawn", role: "Defense", desc: "Guardian's Ward", detail: "Blokir penuh 1 efek hazard (1x/match)", border: "border-blue-500 text-blue-400 bg-blue-950/40" },
    { name: "Wren", role: "Luck", desc: "Foresight", detail: "Reroll dadu setelah melihat hasilnya (1x/match)", border: "border-purple-500 text-purple-400 bg-purple-950/40" },
    { name: "Thistle", role: "Defense", desc: "Stone Stance", detail: "Kena hazard cuma turun setengah jarak (Pasif)", border: "border-amber-600 text-amber-500 bg-amber-950/40" },
    { name: "Brack", role: "Offense", desc: "Retaliation", detail: "Kartu jahat dari musuh memantul kembali (Pasif)", border: "border-green-500 text-green-400 bg-green-950/40" },
    { name: "Ember", role: "Risk/Reward", desc: "Scorch Rush", detail: "Dadu selalu +1, tapi penalti hazard 2x (Pasif)", border: "border-red-500 text-red-400 bg-red-950/40" },
    { name: "Marrow", role: "Comeback", desc: "Second Wind", detail: "Reset pertama berhenti di milestone terakhir (1x/match)", border: "border-zinc-500 text-zinc-400 bg-zinc-900/40" },
    { name: "Sable", role: "Evasion", desc: "Vanish", detail: "Kebal kartu serangan musuh selama 1 ronde (1x/match)", border: "border-stone-500 text-stone-400 bg-stone-900/40" },
    { name: "Halcyon", role: "Mobility", desc: "Swift Stride", detail: "Boleh maju 1-3 tile tambahan setelah landing (1x/match)", border: "border-yellow-500 text-yellow-500 bg-yellow-950/40" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#1B1A1F] text-[#F2E9D8] select-none font-sans">
      {/* Header / Navbar */}
      <header className="w-full border-b border-[#4B4A57]/30 sticky top-0 bg-[#1B1A1F]/90 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E8A33D] rounded-sm flex items-center justify-center font-press-start text-xs text-[#1B1A1F] font-bold">
              P
            </div>
            <span className="font-press-start text-xs md:text-sm tracking-wider text-[#F2E9D8]">
              Pixel<span className="text-[#E8A33D]">Ascend</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="h-10 px-4 flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-[10px] tracking-wider rounded border-b-2 border-[#4B4A57] transition-all cursor-pointer shadow-md"
                style={{ touchAction: "manipulation" }}
              >
                Dashboard
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="h-10 px-4 flex items-center justify-center gap-2 bg-[#232129] border border-[#4B4A57]/60 hover:bg-[#4B4A57]/20 text-[#F2E9D8] font-press-start text-[9px] tracking-wider rounded transition-all cursor-pointer"
                  style={{ touchAction: "manipulation" }}
                >
                  Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col lg:flex-row gap-12 items-center justify-between">
          {/* Left Column: Hype Text */}
          <div className="w-full lg:w-7/12 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
            <div className="inline-block px-3 py-1 bg-[#7C4DA8]/20 border border-[#7C4DA8]/40 rounded-full text-xs text-[#E8A33D] font-mono uppercase tracking-widest">
              RPG board game multiplayer
            </div>
            
            <h1 className="font-press-start text-3xl md:text-4xl lg:text-5xl leading-snug tracking-wide text-[#F2E9D8] w-full">
              Daki Puncak <br />
              <span className="text-[#E8A33D] drop-shadow-[0_3px_0_#4B4A57]">Summit 100</span>!
            </h1>
            
            <p className="text-[#F2E9D8]/80 max-w-xl text-base md:text-lg leading-relaxed">
              Ular tangga digital bertema RPG fantasi gelap dengan 8 karakter unik, board misterius penuh jebakan, dan pertempuran taktis real-time dari HP-mu.
            </p>

            <div className="w-full max-w-xs mt-4">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="w-full h-14 flex items-center justify-center gap-4 bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs tracking-wider rounded-md border-b-4 border-[#4B4A57] transition-all cursor-pointer shadow-lg min-w-[240px] px-6"
                  style={{ touchAction: "manipulation" }}
                >
                  <Play className="w-5 h-5 fill-current" />
                  Mulai Bermain
                </Link>
              ) : (
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
              )}
            </div>
          </div>

          {/* Right Column: Visual Preview Card */}
          <div className="w-full lg:w-5/12 flex justify-center">
            <div className="w-full max-w-md bg-[#232129] border-2 border-[#4B4A57]/40 rounded-lg p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A33D]/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center justify-between border-b border-[#4B4A57]/30 pb-4">
                <span className="font-press-start text-[10px] text-[#E8A33D]">Lobby Preview</span>
                <span className="font-mono text-[10px] text-[#4B4A57]">v1.0.0-mvp</span>
              </div>

              {/* Character grid visual preview */}
              <div className="grid grid-cols-4 gap-4 py-2">
                {characters.map((char, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 cursor-help group"
                  >
                    <div className={`w-12 h-12 rounded border-2 ${char.border} flex items-center justify-center text-lg font-bold shadow-md hover:scale-105 transition-transform`}>
                      {char.name[0]}
                    </div>
                    <span className="text-[10px] font-mono text-[#F2E9D8]/60 group-hover:text-[#E8A33D] transition-colors">
                      {char.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#1B1A1F] rounded p-4 border border-[#4B4A57]/20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#5FA35A] animate-ping"></span>
                  <span className="font-press-start text-[9px] text-[#5FA35A]">► ONLINE MULTIPLAYER</span>
                </div>
                <p className="text-[11px] text-[#F2E9D8]/70 leading-relaxed font-mono">
                  Buat room instan, undang temanmu via kode room, lalu bertarung taktis menggunakan Action Cards &amp; Abilities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features Grid */}
        <section className="bg-[#232129]/40 border-t border-b border-[#4B4A57]/20 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest">FITUR UTAMA</span>
              <h2 className="font-press-start text-lg md:text-xl text-[#F2E9D8] mt-2 mb-4">Mekanik Board Game Baru</h2>
              <p className="text-sm text-[#F2E9D8]/70">
                Ular tangga klasik yang ditingkatkan dengan dinamika RPG modern dan sistem pertempuran taktis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col gap-4">
                <div className="w-12 h-12 bg-[#E8A33D]/10 rounded flex items-center justify-center text-[#E8A33D]">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-press-start text-xs text-[#F2E9D8]">Real-time Multiplayer</h3>
                <p className="text-xs text-[#F2E9D8]/70 leading-relaxed">
                  Bermain bersama 2 sampai 8 pemain secara real-time. Bagikan kode room instan untuk mengundang teman ke pertempuran.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col gap-4">
                <div className="w-12 h-12 bg-[#7C4DA8]/10 rounded flex items-center justify-center text-[#7C4DA8]">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-press-start text-xs text-[#F2E9D8]">Dynamic Board Event</h3>
                <p className="text-xs text-[#F2E9D8]/70 leading-relaxed">
                  Papan Summit 100 dinamis. Hindari Shadow Vine, daki Ancient Ladder, atau hadapi event mendadak seperti Rockslide dan Wisp's Blessing.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col gap-4">
                <div className="w-12 h-12 bg-[#5FA35A]/10 rounded flex items-center justify-center text-[#5FA35A]">
                  <Swords className="w-6 h-6" />
                </div>
                <h3 className="font-press-start text-xs text-[#F2E9D8]">Tactical Actions</h3>
                <p className="text-xs text-[#F2E9D8]/70 leading-relaxed">
                  Dapatkan Action Cards taktis dari peti kuno. Teleportasi dengan Blink, lindungi dirimu dengan Aegis, atau tukar posisi dengan Swap!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Character Roster Details */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest">ROSTER RPG</span>
            <h2 className="font-press-start text-lg md:text-xl text-[#F2E9D8] mt-2 mb-4">Pilih Karakter Andalanku</h2>
            <p className="text-sm text-[#F2E9D8]/70">
              Setiap karakter memiliki kemampuan unik yang menentukan jalannya strategi permainan di atas board.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {characters.map((char, index) => (
              <div 
                key={index}
                className="bg-[#232129] border-2 border-[#4B4A57]/40 rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-[#E8A33D]/60 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-0.5 bg-[#4B4A57]/20 border border-[#4B4A57]/40 text-[9px] font-mono text-[#F2E9D8]/60 uppercase rounded">
                      {char.role}
                    </span>
                    <span className="text-[10px] font-mono text-[#E8A33D]">#0{index + 1}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded border-2 ${char.border} flex items-center justify-center text-base font-bold shadow`}>
                      {char.name[0]}
                    </div>
                    <h3 className="font-press-start text-xs text-[#F2E9D8] group-hover:text-[#E8A33D] transition-colors">
                      {char.name}
                    </h3>
                  </div>
                </div>

                <div className="bg-[#1B1A1F] border border-[#4B4A57]/20 rounded p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#E8A33D]" />
                    <span className="text-[10px] font-press-start text-[#E8A33D] tracking-wider">
                      {char.desc}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#F2E9D8]/70 font-mono leading-relaxed">
                    {char.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to Play Section */}
        <section className="bg-[#232129]/40 border-t border-[#4B4A57]/20 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-press-start text-[10px] text-[#E8A33D] tracking-widest">PANDUAN</span>
              <h2 className="font-press-start text-lg md:text-xl text-[#F2E9D8] mt-2 mb-4">Cara Memulai Game</h2>
              <p className="text-sm text-[#F2E9D8]/70">
                Langkah mudah untuk mulai bertarung naik ke Puncak Summit 100.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-[#232129] border-2 border-[#E8A33D] rounded-full flex items-center justify-center font-press-start text-xs text-[#E8A33D] font-bold">
                  1
                </div>
                <h3 className="font-press-start text-xs text-[#F2E9D8]">Buat / Masuk Room</h3>
                <p className="text-xs text-[#F2E9D8]/70 leading-relaxed max-w-xs">
                  Login Google, buat room baru sebagai Host atau masukkan kode room 6 digit dari temanmu untuk bermain.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-[#232129] border-2 border-[#E8A33D] rounded-full flex items-center justify-center font-press-start text-xs text-[#E8A33D] font-bold">
                  2
                </div>
                <h3 className="font-press-start text-xs text-[#F2E9D8]">Pilih Karakter</h3>
                <p className="text-xs text-[#F2E9D8]/70 leading-relaxed max-w-xs">
                  Di lobi, pilih satu dari delapan roster unik yang belum dipilih pemain lain. Ubah warna kostum sesukamu.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-[#232129] border-2 border-[#E8A33D] rounded-full flex items-center justify-center font-press-start text-xs text-[#E8A33D] font-bold">
                  3
                </div>
                <h3 className="font-press-start text-xs text-[#F2E9D8]">Gunakan Taktik &amp; Dadu</h3>
                <p className="text-xs text-[#F2E9D8]/70 leading-relaxed max-w-xs">
                  Lempar dadu di giliranmu, picu ability karakter, dan simpan Action Cards untuk membalikkan keadaan menuju Summit 100!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#4B4A57]/20 py-8 text-center text-xs text-[#F2E9D8]/40 font-mono bg-[#1B1A1F]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 PixelAscend Project. Built for Bayu&apos;s Community.</p>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-[#5FA35A]">● Live Server OK</span>
            <span className="text-[#4B4A57]">|</span>
            <span>Ver. 1.0.0-mvp</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
