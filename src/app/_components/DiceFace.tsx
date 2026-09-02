"use client";

import React from "react";

interface DiceFaceProps {
  value: number; // 1 to 6
  size?: number; // default 52
  isRolling?: boolean;
}

export const DiceFace: React.FC<DiceFaceProps> = ({
  value,
  size = 52,
  isRolling = false,
}) => {
  const val = Math.max(1, Math.min(6, value || 1));

  // 3x3 Grid position mapping for authentic dice pips:
  // [1, 2, 3]
  // [4, 5, 6]
  // [7, 8, 9]
  const dotMap: Record<number, number[]> = {
    1: [5],
    2: [3, 7],
    3: [3, 5, 7],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  const activeDots = dotMap[val] || [5];

  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#F2B75C] via-[#E8A33D] to-[#8B5A2B] p-1 border-2 border-[#1B1A1F] shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none ${
        isRolling ? "animate-spin" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {/* Inner Beveled Dice Body */}
      <div className="w-full h-full bg-[#1B1A1F] rounded-lg p-1.5 grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center shadow-inner border border-[#4B4A57]/40">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pos) => {
          const isActive = activeDots.includes(pos);
          return (
            <div
              key={pos}
              className={`w-full h-full rounded-full transition-all ${
                isActive
                  ? "bg-gradient-to-tr from-[#E8A33D] via-[#FFF3D1] to-[#FFFFFF] shadow-[0_0_8px_#E8A33D]"
                  : "bg-transparent"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
