"use client";

import React, { useEffect, useState } from "react";

export type Direction = "down" | "left" | "right" | "up";

interface PixelSpriteProps {
  characterId: string;
  variant?: string; // "default" | "crimson" | "moss" | "azure"
  direction?: Direction;
  isWalking?: boolean;
  size?: number; // width & height in px for display
  className?: string;
}

const PALETTE_FILTERS: Record<string, string> = {
  default: "none",
  crimson: "hue-rotate(-40deg) saturate(1.8)",
  moss: "hue-rotate(90deg) saturate(1.4)",
  azure: "hue-rotate(180deg) saturate(1.5)",
};

const DIRECTION_ROW_MAP: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

export const PixelSprite: React.FC<PixelSpriteProps> = ({
  characterId,
  variant = "default",
  direction = "down",
  isWalking = false,
  size = 48,
  className = "",
}) => {
  const spriteUrl = `/sprites/${characterId.toLowerCase()}.png`;
  const filterStyle = PALETTE_FILTERS[variant.toLowerCase()] || "none";

  return (
    <div
      className={`pixelated inline-block relative transition-transform ${isWalking ? "animate-bounce" : ""} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url('${spriteUrl}')`,
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        filter: filterStyle,
      }}
    />
  );
};
