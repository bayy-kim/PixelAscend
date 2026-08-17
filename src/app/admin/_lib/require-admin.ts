import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please log in.");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, status: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin role required.");
  }

  if (user.status === "SUSPENDED") {
    throw new Error("Forbidden: Your account has been suspended.");
  }

  return user;
}
