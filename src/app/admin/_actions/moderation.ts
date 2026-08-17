"use server";

import { requireAdmin } from "../_lib/require-admin";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleUserSuspension(userId: string, targetStatus: "ACTIVE" | "SUSPENDED") {
  const admin = await requireAdmin();

  try {
    await db.user.update({
      where: { id: userId },
      data: { status: targetStatus },
    });

    // Write to audit log
    await db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: targetStatus === "SUSPENDED" ? "SUSPEND_USER" : "UNSUSPEND_USER",
        targetType: "User",
        targetId: userId,
        detail: { status: targetStatus },
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal memperbarui status user." };
  }
}

export async function forceEndRoom(roomId: string) {
  const admin = await requireAdmin();

  try {
    const room = await db.room.update({
      where: { id: roomId },
      data: { status: "ABANDONED", endedAt: new Date() },
    });

    // Write to audit log
    await db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: "FORCE_END_ROOM",
        targetType: "Room",
        targetId: roomId,
        detail: { code: room.code },
      },
    });

    revalidatePath("/admin/rooms");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal menghentikan room." };
  }
}

export async function toggleCharacterStatus(characterId: string, isEnabled: boolean) {
  const admin = await requireAdmin();

  try {
    await db.character.update({
      where: { id: characterId },
      data: { isEnabled },
    });

    // Write to audit log
    await db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: isEnabled ? "ENABLE_CHARACTER" : "DISABLE_CHARACTER",
        targetType: "Character",
        targetId: characterId,
      },
    });

    revalidatePath("/admin/catalog");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal memperbarui status karakter." };
  }
}

export async function toggleThemeStatus(themeId: string, isEnabled: boolean) {
  const admin = await requireAdmin();

  try {
    await db.theme.update({
      where: { id: themeId },
      data: { isEnabled },
    });

    // Write to audit log
    await db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: isEnabled ? "ENABLE_THEME" : "DISABLE_THEME",
        targetType: "Theme",
        targetId: themeId,
      },
    });

    revalidatePath("/admin/catalog");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal memperbarui status tema." };
  }
}
