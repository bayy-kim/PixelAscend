import { requireAdmin } from "../_lib/require-admin";
import { db } from "@/lib/db";

export default async function AdminAuditLogPage() {
  await requireAdmin();

  // Load audit logs with actor information
  const logs = await db.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      actor: true,
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-press-start text-[#E8A33D]">Audit Log</h1>
        <p className="text-xs text-[#F2E9D8]/60 font-mono">Riwayat aksi yang dilakukan oleh administrator</p>
      </div>

      <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#4B4A57]/30 bg-[#1B1A1F]/50 text-xs font-mono text-[#F2E9D8]/50">
                <th className="p-4">Admin</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target</th>
                <th className="p-4">Target ID</th>
                <th className="p-4">Detail</th>
                <th className="p-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[#4B4A57]/10 text-xs font-mono">
                    <td className="p-4 font-bold text-[#F2E9D8]">{log.actor.nickname || log.actor.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        log.action.includes("SUSPEND") || log.action.includes("DISABLE") || log.action.includes("FORCE")
                          ? "bg-[#C24A4A]/10 text-[#C24A4A]"
                          : "bg-[#5FA35A]/10 text-[#5FA35A]"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-[#F2E9D8]/80">{log.targetType}</td>
                    <td className="p-4 text-[#F2E9D8]/50">{log.targetId}</td>
                    <td className="p-4 max-w-xs truncate text-[#F2E9D8]/60">
                      {log.detail ? JSON.stringify(log.detail) : "-"}
                    </td>
                    <td className="p-4 text-[#F2E9D8]/40">
                      {log.createdAt.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#F2E9D8]/30">
                    Belum ada riwayat aksi admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
