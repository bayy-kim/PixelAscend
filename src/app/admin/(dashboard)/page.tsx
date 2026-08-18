import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { db } from "@/lib/db";
import { Users, DoorOpen, Trophy } from "lucide-react";

export default async function AdminDashboardPage() {
  await requireAdmin();

  // Run database aggregations
  const totalUsers = await db.user.count();
  const activeRooms = await db.room.count({
    where: { status: "IN_PROGRESS" },
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const finishedGamesToday = await db.room.count({
    where: {
      status: "FINISHED",
      endedAt: {
        gte: today,
      },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-press-start text-[#E8A33D]">Overview</h1>
        <p className="text-xs text-[#F2E9D8]/60 font-mono">Ringkasan aktivitas platform PixelAscend</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex items-center justify-between shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-press-start text-[#F2E9D8]/50">TOTAL USERS</span>
            <span className="text-3xl font-bold font-sans">{totalUsers}</span>
          </div>
          <Users className="w-8 h-8 text-[#E8A33D]" />
        </div>

        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex items-center justify-between shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-press-start text-[#5FA35A]">ROOMS ACTIVE</span>
            <span className="text-3xl font-bold font-sans">{activeRooms}</span>
          </div>
          <DoorOpen className="w-8 h-8 text-[#5FA35A]" />
        </div>

        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex items-center justify-between shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-press-start text-[#C24A4A]">FINISHED TODAY</span>
            <span className="text-3xl font-bold font-sans">{finishedGamesToday}</span>
          </div>
          <Trophy className="w-8 h-8 text-[#C24A4A]" />
        </div>
      </div>
    </div>
  );
}
