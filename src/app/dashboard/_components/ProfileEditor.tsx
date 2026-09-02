"use client";

import { useState, useRef, useTransition } from "react";
import { updateNickname, uploadAvatar, updateFavoriteCharacter } from "../_actions/profile";
import Image from "next/image";
import { PixelSprite } from "@/app/_components/PixelSprite";
import { Sparkles, Check } from "lucide-react";

interface ProfileEditorProps {
  initialNickname: string | null;
  initialName: string;
  initialAvatar: string | null;
  initialFavoriteCharacterId?: string;
}

const HEROES = [
  { id: "dawn", name: "Dawn" },
  { id: "wren", name: "Wren" },
  { id: "thistle", name: "Thistle" },
  { id: "brack", name: "Brack" },
  { id: "ember", name: "Ember" },
  { id: "marrow", name: "Marrow" },
  { id: "sable", name: "Sable" },
  { id: "halcyon", name: "Halcyon" },
];

export default function ProfileEditor({
  initialNickname,
  initialName,
  initialAvatar,
  initialFavoriteCharacterId = "dawn",
}: ProfileEditorProps) {
  const [nickname, setNickname] = useState(initialNickname || initialName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar);
  const [favoriteChar, setFavoriteChar] = useState<string>(initialFavoriteCharacterId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [isPendingNickname, startNicknameTransition] = useTransition();
  const [isPendingAvatar, startAvatarTransition] = useTransition();
  const [isPendingHero, startHeroTransition] = useTransition();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFavoriteHeroChange = (charId: string) => {
    setError(null);
    setSuccess(null);
    startHeroTransition(async () => {
      const res = await updateFavoriteCharacter(charId);
      if (res?.error) {
        setError(res.error);
      } else {
        setFavoriteChar(charId);
        setSuccess(`Hero Utama berhasil diubah ke ${charId.toUpperCase()}!`);
      }
    });
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startNicknameTransition(async () => {
      const res = await updateNickname(nickname);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess("Nickname berhasil diperbarui!");
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Client-side file type verification
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Format file tidak didukung. Gunakan JPEG, PNG, atau WEBP.");
      return;
    }

    startAvatarTransition(async () => {
      try {
        // Perform client-side compression & resizing to 512x512 using Canvas API
        const compressedFile = await compressImage(file, 512, 512);
        
        // Show optimistic update preview immediately
        const previewUrl = URL.createObjectURL(compressedFile);
        setAvatarPreview(previewUrl);

        const formData = new FormData();
        formData.append("avatar", compressedFile);

        const res = await uploadAvatar(formData);
        if (res?.error) {
          setError(res.error);
          setAvatarPreview(initialAvatar); // Revert on failure
        } else {
          setSuccess("Foto profil berhasil diperbarui!");
          if (res.url) {
            setAvatarPreview(res.url);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Gagal mengompres gambar.");
        setAvatarPreview(initialAvatar);
      }
    });
  };

  // Canvas Image Compression Helper
  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Resize while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Gagal memuat canvas 2D"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Export canvas to compressed WebP blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: "image/webp",
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              } else {
                reject(new Error("Gagal mengonversi canvas ke Blob"));
              }
            },
            "image/webp",
            0.85 // quality
          );
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  return (
    <div className="w-full bg-[#232129] border border-[#4B4A57]/30 rounded-lg p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#4B4A57]/20">
        {/* Avatar Upload */}
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-md border-2 border-[#E8A33D] overflow-hidden bg-[#1B1A1F] relative flex items-center justify-center">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                fill
                className="object-cover pixelated"
                unoptimized
              />
            ) : (
              <span className="font-press-start text-lg text-[#F2E9D8]/40">?</span>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-[10px] font-mono text-[#E8A33D] font-bold text-center px-2">UBAH FOTO</span>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isPendingAvatar}
          />
        </div>

        <div className="flex-1 flex flex-col gap-1 text-center sm:text-left">
          <span className="font-press-start text-xs text-[#E8A33D]">{nickname || initialName}</span>
          <span className="text-xs text-[#F2E9D8]/70 font-mono">ID: {initialName}</span>
          <span className="text-[11px] text-[#F2E9D8]/70 leading-relaxed font-sans max-w-sm mt-1">
            Tap foto profil untuk mengganti (JPG/PNG/WEBP, Max 2MB, dikompresi otomatis).
          </span>
        </div>
      </div>

      {/* Nickname Form */}
      <form onSubmit={handleNicknameSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-press-start text-[#F2E9D8]/90">Nickname Baru</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 bg-[#1B1A1F] border border-[#4B4A57]/50 rounded px-4 py-3 text-sm text-[#F2E9D8] focus:outline-none focus:border-[#E8A33D]"
              maxLength={20}
              placeholder="3-20 karakter alfanumerik"
              disabled={isPendingNickname}
              required
            />
            <button
              type="submit"
              className="bg-[#E8A33D] hover:bg-[#F2B75C] active:translate-y-[1px] text-[#1B1A1F] font-press-start text-xs px-6 rounded transition-all cursor-pointer shadow-md disabled:opacity-50 min-h-[44px]"
              disabled={isPendingNickname}
            >
              {isPendingNickname ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>
      </form>

      {/* Main Hero / Favorite Character Selector */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#4B4A57]/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-press-start text-[#E8A33D] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> HERO UTAMA (AUTO PRE-SELECT)
          </label>
          <span className="text-[10px] font-mono text-[#F2E9D8]/70">Dipilih otomatis di Lobby</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {HEROES.map((h) => {
            const isSelected = favoriteChar === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => handleFavoriteHeroChange(h.id)}
                disabled={isPendingHero}
                className={`p-2 bg-[#1B1A1F] border rounded flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-[#E8A33D] bg-[#E8A33D]/10"
                    : "border-[#4B4A57]/30 hover:border-[#4B4A57]"
                }`}
              >
                <PixelSprite characterId={h.id} direction="down" isWalking={isSelected} size={32} />
                <span className={`text-[9px] font-mono capitalize truncate max-w-full ${isSelected ? "text-[#E8A33D] font-bold" : "text-[#F2E9D8]/60"}`}>
                  {h.name}
                </span>
                {isSelected && (
                  <div className="absolute top-0.5 right-0.5 bg-[#E8A33D] text-[#1B1A1F] rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-[#C24A4A]/20 border border-[#C24A4A]/40 rounded text-xs text-[#C24A4A] font-mono">
          [ERR] {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-[#5FA35A]/20 border border-[#5FA35A]/40 rounded text-xs text-[#5FA35A] font-mono">
          [OK] {success}
        </div>
      )}
    </div>
  );
}
