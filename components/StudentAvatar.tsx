'use client';

import React, { useState } from 'react';

interface StudentAvatarProps {
  photoUrl?: string;
  fullName: string;
  size?: 'sm' | 'md';
}

export function StudentAvatar({ photoUrl, fullName, size = 'sm' }: StudentAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (trimmed.charAt(0) || 'S').toUpperCase();

  const sizeClass = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

  if (!photoUrl || hasError) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} rounded-full bg-accent-soft text-accent-soft-ink flex items-center justify-center font-semibold border border-accent-soft-border shrink-0 select-none`}
      >
        {initials}
      </div>
    );
  }

  const normalizedUrl = photoUrl.startsWith('//') ? `https:${photoUrl}` : photoUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizedUrl}
      alt={fullName}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${sizeClass} rounded-full object-cover border border-border-subtle bg-surface-subtle shrink-0`}
    />
  );
}
