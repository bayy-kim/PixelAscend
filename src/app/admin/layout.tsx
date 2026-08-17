import { requireAdmin } from "./_lib/require-admin";
import Link from "next/link";
import { LayoutDashboard, Users, DoorOpen, Palette, ScrollText, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hard session check
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-[#1B1A1F] text-[#F2E9D8] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#232129] border-r border-[#4B4A57]/30 flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3 border-b border-[#4B4A57]/20 pb-4">
          <div className="w-7 h-7 bg-[#C24A4A] rounded-sm flex items-center justify-center font-press-start text-xs text-white font-bold">
            A
          </div>
          <span className="font-press-start text-xs tracking-wider text-white">
            Admin<span className="text-[#C24A4A]">Panel</span>
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <Users className="w-4 h-4" />
            Users
          </Link>
          <Link
            href="/admin/rooms"
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <DoorOpen className="w-4 h-4" />
            Rooms
          </Link>
          <Link
            href="/admin/catalog"
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <Palette className="w-4 h-4" />
            Catalog
          </Link>
          <Link
            href="/admin/audit-log"
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <ScrollText className="w-4 h-4" />
            Audit Log
          </Link>
        </nav>

        <div className="border-t border-[#4B4A57]/20 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded text-xs font-mono text-[#F2E9D8]/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
