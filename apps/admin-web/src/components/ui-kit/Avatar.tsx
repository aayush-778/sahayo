'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  name: string;
  src?: string;
  /** Pixel diameter. Also sets the intrinsic size Next requests. */
  size?: number;
  className?: string;
}

/** "Priya Kumari" becomes "PK"; a single-word name becomes its first letter. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

/**
 * Avatars fall back to initials in a marigold-tint circle when the remote image
 * fails. Seed avatars come from a third-party placeholder service, and a broken
 * image on a projector is not an acceptable failure mode — so the fallback is
 * built in here rather than bolted on during demo hardening.
 */
export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-marigold-tint',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={name}
          width={size}
          height={size}
          unoptimized
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="font-semibold text-ink"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
          aria-hidden
        >
          {initialsOf(name)}
        </span>
      )}
      {showImage ? null : <span className="sr-only">{name}</span>}
    </span>
  );
}
