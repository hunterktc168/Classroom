'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Copy, Mail } from 'lucide-react';
import { ClassroomStudent } from '@/lib/types';
import { StudentAvatar } from './StudentAvatar';

export type SortField = 'name' | 'email' | 'id';
export type SortDirection = 'asc' | 'desc';

interface RosterTableProps {
  students: ClassroomStudent[];
  isLoading: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
}

export function RosterTable({
  students,
  isLoading,
  sortField,
  sortDirection,
  onSortChange,
}: RosterTableProps) {
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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-accent" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-accent" />
    );
  };

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading student roster" className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-ink-muted">
              <th scope="col" className="py-3 pl-5 pr-3 w-12 font-mono">
                #
              </th>
              <th scope="col" className="py-3 px-4">
                Student
              </th>
              <th scope="col" className="py-3 px-4">
                Email Address
              </th>
              <th scope="col" className="py-3 pl-4 pr-5 text-right font-mono">
                User ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/70">
            {[0, 1, 2, 3, 4].map((idx) => (
              <tr key={idx} className="animate-pulse">
                <td className="py-3.5 pl-5 pr-3">
                  <div className="h-3.5 w-4 bg-skeleton rounded" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-skeleton shrink-0" />
                    <div className="h-3.5 w-36 bg-skeleton rounded" />
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-48 bg-skeleton-soft rounded" />
                </td>
                <td className="py-3.5 pl-4 pr-5">
                  <div className="h-3.5 w-24 bg-skeleton-soft rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-ink-muted">
            <th scope="col" className="py-3 pl-5 pr-3 w-12 font-mono tabular-nums">
              #
            </th>
            <th scope="col" className="py-3 px-4">
              <button
                type="button"
                onClick={() => onSortChange('name')}
                className="inline-flex items-center gap-1.5 hover:text-ink-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Student</span>
                {renderSortIcon('name')}
              </button>
            </th>
            <th scope="col" className="py-3 px-4">
              <button
                type="button"
                onClick={() => onSortChange('email')}
                className="inline-flex items-center gap-1.5 hover:text-ink-primary transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Email Address</span>
                {renderSortIcon('email')}
              </button>
            </th>
            <th scope="col" className="py-3 pl-4 pr-5 text-right">
              <button
                type="button"
                onClick={() => onSortChange('id')}
                className="inline-flex items-center justify-end gap-1.5 ml-auto hover:text-ink-primary transition-colors cursor-pointer font-mono whitespace-nowrap"
              >
                <span>User ID</span>
                {renderSortIcon('id')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/70">
          {students.map((student, index) => {
            const fullName = student.profile?.name?.fullName || 'Enrolled Student';
            const email = student.profile?.emailAddress;
            const isCopied = copiedUserId === student.userId;

            return (
              <tr
                key={student.userId}
                className="group hover:bg-surface-hover transition-colors duration-100"
              >
                <td className="py-3 pl-5 pr-3 font-mono text-xs text-ink-muted tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      photoUrl={student.profile?.photoUrl}
                      fullName={fullName}
                    />
                    <span className="font-medium text-ink-primary truncate max-w-[260px]">
                      {fullName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {email ? (
                    <div className="flex items-center gap-2 text-xs text-ink-secondary">
                      <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      <span className="truncate max-w-[260px]">{email}</span>
                      <button
                        type="button"
                        onClick={() => void handleCopyEmail(student.userId, email)}
                        title={`Copy ${email}`}
                        aria-label={`Copy email address for ${fullName}`}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition-opacity cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted">Not shared</span>
                  )}
                </td>
                <td className="py-3 pl-4 pr-5 text-right font-mono text-xs text-ink-muted tabular-nums">
                  {student.userId}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
