"use client";

import React, { useEffect, useState } from "react";

export type Direction = "down" | "left" | "right" | "up";

interface PixelSpriteProps {
  characterId: string;
  direction?: Direction;
  isWalking?: boolean;
  size?: number; // width & height in px for display
  className?: string;
}

const DIRECTION_ROW_MAP: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

export const PixelSprite: React.FC<PixelSpriteProps> = ({
  characterId,
  direction = "down",
  isWalking = false,
  size = 48,
  className = "",
}) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isWalking) {
      setFrameIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % 3);
    }, 150); // 150ms per walk frame step

    return () => clearInterval(interval);
  }, [isWalking]);

  const row = DIRECTION_ROW_MAP[direction];
  const spriteUrl = `/sprites/${characterId}.png`;

  // Scale calculations: Each cell is 32x32px in a 96x128px sheet (3 cols x 4 rows)
  const backgroundPositionX = -frameIndex * size;
  const backgroundPositionY = -row * size;
  const backgroundSize = `${size * 3}px ${size * 4}px`;

  return (
    <div
      className={`pixelated inline-block relative ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url('${spriteUrl}')`,
        backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
        backgroundSize: backgroundSize,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
};
