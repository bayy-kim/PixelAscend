import { requireAdmin } from "@/app/admin/_lib/require-admin";
import AdminSidebar from "./_components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hard session check
  await requireAdmin();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#1B1A1F] text-[#F2E9D8] font-sans">
      <AdminSidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
