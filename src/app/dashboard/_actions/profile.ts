"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Max size 2MB (2 * 1024 * 1024 bytes)
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function updateFavoriteCharacter(characterId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validChar = await db.character.findUnique({
    where: { id: characterId, isEnabled: true },
  });
  if (!validChar) {
    return { error: "Karakter tidak valid atau dinonaktifkan." };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { favoriteCharacterId: characterId },
    });
    revalidatePath("/dashboard");
    return { success: true, favoriteCharacterId: characterId };
  } catch (err) {
    console.error(err);
    return { error: "Gagal menyimpan Hero Utama." };
  }
}

export async function updateNickname(nickname: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Validate nickname: 3-20 characters, alphanumeric and spaces
  const trimmed = nickname.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { error: "Nickname harus berukuran 3–20 karakter." };
  }
  const regex = /^[a-zA-Z0-9 ]+$/;
  if (!regex.test(trimmed)) {
    return { error: "Nickname hanya boleh berisi alfanumerik dan spasi." };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { nickname: trimmed },
    });
    revalidatePath("/dashboard");
    return { success: true, nickname: trimmed };
  } catch (err) {
    console.error(err);
    return { error: "Gagal memperbarui nickname di database." };
  }
}

export async function uploadAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const file = formData.get("avatar") as File | null;
  if (!file) {
    return { error: "Tidak ada file yang diunggah." };
  }

  // Server-side size check
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Ukuran file melebihi batas maksimal 2MB." };
  }

  // Server-side MIME validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: "Format file tidak didukung. Gunakan JPEG, PNG, atau WEBP." };
  }

  try {
    // If Vercel Blob token exists, upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      // Sanitize filename to avoid directory traversal
      const sanitizedName = `avatars/${session.user.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      
      const blob = await put(sanitizedName, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      await db.user.update({
        where: { id: session.user.id },
        data: { avatarUrl: blob.url },
      });

      revalidatePath("/dashboard");
      return { success: true, url: blob.url };
    } else {
      // Local fallback placeholder (e.g. dataURL representation or mock saving)
      // For MVP without BLOB token, convert to a base64 Data URL and save to DB
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      await db.user.update({
        where: { id: session.user.id },
        data: { avatarUrl: dataUrl },
      });

      revalidatePath("/dashboard");
      return { success: true, url: dataUrl };
    }
  } catch (err) {
    console.error(err);
    return { error: "Gagal mengunggah foto profil. Silakan coba lagi." };
  }
}
