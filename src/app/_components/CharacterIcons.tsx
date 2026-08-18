import React from "react";

interface IconProps {
  className?: string;
  palette?: string;
}

export function CharacterIcon({ characterId, className = "w-12 h-12" }: { characterId: string; className?: string }) {
  const id = characterId.toLowerCase();

  if (id.startsWith("dawn")) {
    // Dawn: Knight helmet with blue plume
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#4B4A57" />
        <path d="M30 65 L70 65 L65 35 L35 35 Z" fill="#708090" />
        <rect x="40" y="45" width="20" height="8" rx="2" fill="#1b1a1f" />
        <path d="M50 35 L50 20 C50 15, 60 15, 65 20" stroke="#1e3a8a" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (id.startsWith("wren")) {
    // Wren: Purple magic hood with pointed elf ears
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#2d1b4e" />
        <path d="M50 25 C30 25, 35 65, 50 75 C65 65, 70 25, 50 25 Z" fill="#5b21b6" />
        <path d="M35 45 C20 40, 25 50, 35 52 M65 45 C80 40, 75 50, 65 52" stroke="#ffe4e1" strokeWidth="4" fill="none" strokeLinecap="round" />
        <polygon points="50,42 45,55 55,55" fill="#a78bfa" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (id.startsWith("thistle")) {
    // Thistle: Dwarf gold shield with cross hammer
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#78350f" />
        <path d="M30 35 C30 35, 50 30, 70 35 C70 55, 50 75, 50 75 C50 75, 30 55, 30 35 Z" fill="#b45309" stroke="#d97706" strokeWidth="3" />
        <line x1="40" y1="60" x2="60" y2="40" stroke="#7c2d12" strokeWidth="6" strokeLinecap="round" />
        <rect x="52" y="32" width="12" height="12" rx="2" fill="#7c2d12" transform="rotate(45 58 38)" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (id.startsWith("brack")) {
    // Brack: Green Orc head with white fangs
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#14532d" />
        <circle cx="50" cy="50" r="22" fill="#16a34a" />
        <polygon points="35,62 38,52 42,58" fill="#ffffff" />
        <polygon points="65,62 62,52 58,58" fill="#ffffff" />
        <rect x="30" y="44" width="40" height="4" rx="2" fill="#15803d" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (id.startsWith("ember")) {
    // Ember: Red Dragonkin head with yellow glowing eyes
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#7f1d1d" />
        <path d="M35 30 L45 42 L55 42 L65 30 L60 55 L40 55 Z" fill="#dc2626" />
        <polygon points="32,25 38,35 34,35" fill="#f59e0b" />
        <polygon points="68,25 62,35 66,35" fill="#f59e0b" />
        <circle cx="45" cy="48" r="3" fill="#facc15" />
        <circle cx="55" cy="48" r="3" fill="#facc15" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (id.startsWith("marrow")) {
    // Marrow: Skeleton Skull
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#27272a" />
        <rect x="34" y="32" width="32" height="30" rx="10" fill="#f4f4f5" />
        <rect x="42" y="55" width="16" height="12" rx="3" fill="#f4f4f5" />
        <circle cx="42" cy="44" r="5" fill="#1b1a1f" />
        <circle cx="58" cy="44" r="5" fill="#1b1a1f" />
        <line x1="46" y1="60" x2="46" y2="67" stroke="#1b1a1f" strokeWidth="2" />
        <line x1="50" y1="60" x2="50" y2="67" stroke="#1b1a1f" strokeWidth="2" />
        <line x1="54" y1="60" x2="54" y2="67" stroke="#1b1a1f" strokeWidth="2" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (id.startsWith("sable")) {
    // Sable: Shadow cloak rogue with glowing purple eyes
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="16" fill="#1c1917" />
        <path d="M50 25 C32 25, 30 65, 50 75 C70 65, 68 25, 50 25 Z" fill="#292524" />
        <ellipse cx="43" cy="50" rx="3" ry="1.5" fill="#c084fc" />
        <ellipse cx="57" cy="50" rx="3" ry="1.5" fill="#c084fc" />
        <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  // Default fallback: Halcyon (Centaur bow)
  return (
    <svg className={`${className} fill-current`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="#1e293b" />
      <path d="M35 65 C35 35, 65 35, 65 35" stroke="#d97706" strokeWidth="4" fill="none" />
      <line x1="30" y1="70" x2="70" y2="30" stroke="#f59e0b" strokeWidth="3" />
      <polygon points="70,30 60,32 68,40" fill="#f59e0b" />
      <circle cx="50" cy="50" r="32" stroke="#E8A33D" strokeWidth="3" fill="none" />
    </svg>
  );
}
