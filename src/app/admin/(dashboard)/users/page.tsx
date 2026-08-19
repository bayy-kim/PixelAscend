import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { db } from "@/lib/db";
import { toggleUserSuspension } from "@/app/admin/_actions/moderation";
import Image from "next/image";
import { Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";

  // Filter users by nickname/name/email if query present
  const users = await db.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { nickname: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-press-start text-[#E8A33D]">User Management</h1>
          <p className="text-xs text-[#F2E9D8]/60 font-mono">Daftar pengguna terdaftar di PixelAscend</p>
        </div>

        {/* Search Bar */}
        <form method="GET" className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#F2E9D8]/40 absolute left-3 top-3" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Cari user / email..."
            className="w-full bg-[#232129] border border-[#4B4A57]/30 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-[#F2E9D8] focus:outline-none focus:border-[#E8A33D]"
          />
        </form>
      </div>

      <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#4B4A57]/30 bg-[#1B1A1F]/50 text-xs font-mono text-[#F2E9D8]/50">
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-[#4B4A57]/10 text-sm font-mono">
                  <td className="p-4 flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded overflow-hidden border border-[#4B4A57]/20 bg-[#1B1A1F]">
                      <Image
                        src={user.avatarUrl || user.image || "/favicon.ico"}
                        alt={user.name}
                        fill
                        className="object-cover pixelated"
                        unoptimized
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#F2E9D8]">{user.nickname || user.name}</span>
                      <span className="text-[10px] text-[#F2E9D8]/30">ID: {user.id}</span>
                    </div>
                  </td>
                  <td className="p-4 text-[#F2E9D8]/80">{user.email}</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      user.role === "ADMIN" 
                        ? "bg-[#C24A4A]/20 text-[#C24A4A] border border-[#C24A4A]/30" 
                        : "bg-[#4B4A57]/20 text-[#F2E9D8]/70"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      user.status === "ACTIVE" 
                        ? "bg-[#5FA35A]/20 text-[#5FA35A]" 
                        : "bg-[#C24A4A]/20 text-[#C24A4A]"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <form
                      action={async () => {
                        "use server";
                        const target = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                        await toggleUserSuspension(user.id, target);
                      }}
                    >
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded font-press-start cursor-pointer border-b-2 border-black ${
                          user.status === "ACTIVE"
                            ? "bg-[#C24A4A] hover:bg-[#d65c5c] text-white"
                            : "bg-[#5FA35A] hover:bg-[#72b86d] text-white"
                        }`}
                        style={{ touchAction: "manipulation" }}
                      >
                        {user.status === "ACTIVE" ? "SUSPEND" : "UNSUSPEND"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
