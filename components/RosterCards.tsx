'use client';

import React, { useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';
import { ClassroomStudent } from '@/lib/types';
import { StudentAvatar } from './StudentAvatar';

interface RosterCardsProps {
  students: ClassroomStudent[];
  isLoading: boolean;
}

export function RosterCards({ students, isLoading }: RosterCardsProps) {
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const handleCopyEmail = async (userId: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedUserId(userId);
      setTimeout(() => {
        setCopiedUserId((prev) => (prev === userId ? null : prev));
      }, 1600);
    } catch {
      // Clipboard unavailable
    }
  };

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading student cards"
        className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-border-subtle bg-surface animate-pulse flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-full bg-skeleton shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3.5 w-32 bg-skeleton rounded" />
              <div className="h-3 w-44 bg-skeleton-soft rounded" />
              <div className="h-3 w-24 bg-skeleton-soft rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => {
        const fullName = student.profile?.name?.fullName || 'Enrolled Student';
        const email = student.profile?.emailAddress;
        const isCopied = copiedUserId === student.userId;

        return (
          <article
            key={student.userId}
            className="p-4 rounded-xl border border-border-subtle bg-surface hover:border-border-strong transition-colors flex items-start gap-3.5 cyberpunk:hover:shadow-[0_0_20px_-8px_rgba(0,229,255,0.28)]"
          >
            <StudentAvatar
              photoUrl={student.profile?.photoUrl}
              fullName={fullName}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-ink-primary truncate">{fullName}</h3>

              {email ? (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
                  <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <span className="truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyEmail(student.userId, email)}
                    title={`Copy ${email}`}
                    aria-label={`Copy email address for ${fullName}`}
                    className="p-0.5 rounded text-ink-muted hover:text-ink-primary transition-colors shrink-0 cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">Email not shared</p>
              )}

              <p className="mt-2 font-mono text-[11px] text-ink-muted tabular-nums truncate">
                ID {student.userId}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
