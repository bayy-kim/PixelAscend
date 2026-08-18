import React from "react";
import { PixelSprite } from "./PixelSprite";

export function CharacterIcon({ characterId, className = "" }: { characterId: string; className?: string }) {
  return <PixelSprite characterId={characterId.toLowerCase()} direction="down" size={32} className={className} />;
}
