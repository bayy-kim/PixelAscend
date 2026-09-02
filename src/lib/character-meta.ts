export interface CharacterMedia {
  id: string;
  name: string;
  assetName: string;
  povImage: string;
  walkVideo: string;
  colorTheme: string;
}

export const CHARACTER_MEDIA_MAP: Record<string, CharacterMedia> = {
  dawn: {
    id: "dawn",
    name: "Dawn — Asha (Ksatria)",
    assetName: "asha",
    povImage: "/aset_karakter/POVasha.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANasha.mp4",
    colorTheme: "#E8A33D",
  },
  wren: {
    id: "wren",
    name: "Wren — Lyra (Mistikus)",
    assetName: "lyra",
    povImage: "/aset_karakter/POVlyra.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANlyra.mp4",
    colorTheme: "#7C4DA8",
  },
  thistle: {
    id: "thistle",
    name: "Thistle — Silo (Penjaga)",
    assetName: "silo",
    povImage: "/aset_karakter/POVsilo.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANsilo.mp4",
    colorTheme: "#5FA35A",
  },
  brack: {
    id: "brack",
    name: "Brack — Jax (Petarung)",
    assetName: "jax",
    povImage: "/aset_karakter/POVjax.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANjax.mp4",
    colorTheme: "#C24A4A",
  },
  ember: {
    id: "ember",
    name: "Ember — Kael (Dragonkin)",
    assetName: "kael",
    povImage: "/aset_karakter/POVkael.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANkael.mp4",
    colorTheme: "#E85D3D",
  },
  marrow: {
    id: "marrow",
    name: "Marrow — Vex (Skeleton)",
    assetName: "vex",
    povImage: "/aset_karakter/POVvex.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANvex.mp4",
    colorTheme: "#8E9AA8",
  },
  sable: {
    id: "sable",
    name: "Sable — Raya (Bayangan)",
    assetName: "raya",
    povImage: "/aset_karakter/POVraya.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANraya.mp4",
    colorTheme: "#4B4A57",
  },
  halcyon: {
    id: "halcyon",
    name: "Halcyon — Nova (Ranger)",
    assetName: "nova",
    povImage: "/aset_karakter/POVnova.jpeg",
    walkVideo: "/aset_karakter/ANIMASI _BERJALANnova.mp4",
    colorTheme: "#3DA8E8",
  },
};

export function getCharacterMedia(characterId: string): CharacterMedia {
  const normalizedId = characterId.toLowerCase();
  return (
    CHARACTER_MEDIA_MAP[normalizedId] || {
      id: normalizedId,
      name: characterId,
      assetName: "asha",
      povImage: "/aset_karakter/POVasha.jpeg",
      walkVideo: "/aset_karakter/ANIMASI _BERJALANasha.mp4",
      colorTheme: "#E8A33D",
    }
  );
}
