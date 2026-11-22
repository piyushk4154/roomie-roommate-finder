import { BookOpen, Coffee, Compass, Headphones, Home, Leaf, Moon, Sun } from 'lucide-react';

export interface AvatarPreset {
  id: string;
  label: string;
  bgClass: string;
  textClass: string;
  icon: typeof Sun;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'preset:1', label: 'Morning Sun', bgClass: 'bg-amber-100', textClass: 'text-amber-800', icon: Sun },
  { id: 'preset:2', label: 'Chai & Mug', bgClass: 'bg-rose-100', textClass: 'text-rose-800', icon: Coffee },
  { id: 'preset:3', label: 'Headphones', bgClass: 'bg-indigo-100', textClass: 'text-indigo-800', icon: Headphones },
  { id: 'preset:4', label: 'Bookworm', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800', icon: BookOpen },
  { id: 'preset:5', label: 'Night Owl', bgClass: 'bg-slate-200', textClass: 'text-slate-800', icon: Moon },
  { id: 'preset:6', label: 'Plant Lover', bgClass: 'bg-teal-100', textClass: 'text-teal-800', icon: Leaf },
  { id: 'preset:7', label: 'Explorer', bgClass: 'bg-sky-100', textClass: 'text-sky-800', icon: Compass },
  { id: 'preset:8', label: 'Cozy Home', bgClass: 'bg-violet-100', textClass: 'text-violet-800', icon: Home },
];

interface AvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ name, avatar = 'initials', size = 'md' }: AvatarProps) {
  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'md'
        ? 'w-12 h-12 text-sm'
        : size === 'lg'
          ? 'w-16 h-16 text-lg'
          : 'w-20 h-20 text-xl';

  const iconSizes =
    size === 'sm'
      ? 'w-4 h-4'
      : size === 'md'
        ? 'w-5 h-5'
        : size === 'lg'
          ? 'w-7 h-7'
          : 'w-8 h-8';

  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  if (preset) {
    const Icon = preset.icon;
    return (
      <div
        className={`inline-flex items-center justify-center rounded-2xl shrink-0 font-display font-bold ${sizeClasses} ${preset.bgClass} ${preset.textClass}`}
        aria-label={`${name} avatar`}
      >
        <Icon className={iconSizes} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl shrink-0 font-display font-bold bg-indigo-100 text-indigo-800 ${sizeClasses}`}
      aria-label={`${name} initials`}
    >
      {getInitials(name)}
    </div>
  );
}
