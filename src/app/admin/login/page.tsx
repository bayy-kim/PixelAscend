import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const session = await auth();

  // If already logged in as ADMIN, redirect to admin dashboard
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  return (
    <div className="flex flex-col min-h-screen bg-[#1B1A1F] text-[#F2E9D8] select-none justify-center items-center px-6">
      <div className="w-full max-w-md bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-8 flex flex-col gap-6 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#C24A4A]/5 rounded-full blur-2xl"></div>

        <div className="flex flex-col gap-2 items-center text-center">
          <div className="w-10 h-10 bg-[#C24A4A] rounded-sm flex items-center justify-center font-press-start text-sm text-white font-bold mb-2">
            A
          </div>
          <h1 className="font-press-start text-xs tracking-wider text-white">
            ADMIN LOGIN
          </h1>
          <p className="text-[11px] text-[#F2E9D8]/50 font-mono">
            Masuk ke panel moderasi PixelAscend
          </p>
        </div>

        <form
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirectTo: "/admin",
              });
            } catch (err: any) {
              if (isRedirectError(err)) {
                throw err;
              }
              redirect("/admin/login?error=InvalidCredentials");
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-press-start text-[#F2E9D8]/60">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="bg-[#1B1A1F] border border-[#4B4A57]/30 rounded px-4 py-3 text-xs font-mono text-[#F2E9D8] focus:outline-none focus:border-[#C24A4A]"
              placeholder="admin@pixelascend.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-press-start text-[#F2E9D8]/60">Password</label>
            <input
              type="password"
              name="password"
              required
              className="bg-[#1B1A1F] border border-[#4B4A57]/30 rounded px-4 py-3 text-xs font-mono text-[#F2E9D8] focus:outline-none focus:border-[#C24A4A]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-[#C24A4A]/20 border border-[#C24A4A]/40 rounded text-[11px] text-[#C24A4A] font-mono">
              [ERR] Email atau Password salah!
            </div>
          )}

          <button
            type="submit"
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#C24A4A] hover:bg-[#d65c5c] active:translate-y-[1px] text-white font-press-start text-[10px] tracking-wider rounded border-b-4 border-black transition-all cursor-pointer shadow-md mt-2"
          >
            <Lock className="w-3.5 h-3.5" />
            LOG IN SECURE
          </button>
        </form>

        <div className="border-t border-[#4B4A57]/20 pt-4 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-[10px] font-mono text-[#F2E9D8]/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
