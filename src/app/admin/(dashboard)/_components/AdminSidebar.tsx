"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, DoorOpen, Palette, ScrollText, ArrowLeft, Menu, X } from "lucide-react";

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden w-full bg-[#232129] border-b border-[#4B4A57]/30 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#C24A4A] rounded-sm flex items-center justify-center font-press-start text-xs text-white font-bold">
            A
          </div>
          <span className="font-press-start text-xs tracking-wider text-white">
            Admin<span className="text-[#C24A4A]">Panel</span>
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-[#F2E9D8] hover:text-[#E8A33D] transition-colors cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#232129] border-r border-[#4B4A57]/30 flex flex-col gap-6 p-6 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:flex items-center gap-3 border-b border-[#4B4A57]/20 pb-4">
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
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <Users className="w-4 h-4" />
            Users
          </Link>
          <Link
            href="/admin/rooms"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <DoorOpen className="w-4 h-4" />
            Rooms
          </Link>
          <Link
            href="/admin/catalog"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded text-xs font-press-start hover:bg-[#1B1A1F] hover:text-[#E8A33D] transition-colors"
          >
            <Palette className="w-4 h-4" />
            Catalog
          </Link>
          <Link
            href="/admin/audit-log"
            onClick={() => setIsOpen(false)}
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

      {/* Overlay Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
        />
      )}
    </>
  );
}
