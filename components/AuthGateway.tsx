'use client';

import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, BookOpen, ShieldCheck, Users } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthGatewayProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  error: string | null;
}

export function AuthGateway({ onSignIn, isSigningIn, error }: AuthGatewayProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto mt-6 sm:mt-10"
    >
      <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden transition-colors duration-200 cyberpunk:shadow-[0_0_32px_-12px_rgba(0,229,255,0.22)]">
        <div className="p-8 sm:p-12">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-accent tracking-tight cyberpunk:text-pink-400">
              Google Classroom Workspace
            </p>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary text-balance">
              Course selection and student rosters in one workspace
            </h1>
            <p className="mt-3 text-sm sm:text-[15px] text-ink-secondary leading-relaxed">
              Connect your Google account to browse active Classroom courses, inspect enrolled
              student directories, filter rosters in real time, and export clean CSV snapshots.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 p-3.5 bg-danger-bg border border-danger-border rounded-lg flex items-start gap-2.5 text-xs text-danger-ink"
              >
                <AlertCircle className="w-4 h-4 text-danger-icon shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <GoogleSignInButton
                onClick={onSignIn}
                disabled={isSigningIn}
                label={isSigningIn ? 'Connecting account...' : 'Sign in with Google'}
              />
              <span className="text-xs text-ink-muted">
                Read-only access · Session cached in memory only
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle bg-surface-subtle/60 px-8 sm:px-12 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-ink-muted shrink-0 mt-0.5 cyberpunk:text-cyan-400" />
            <div>
              <p className="text-xs font-semibold text-ink-primary">Active Courses</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Lists active classes synced directly from Classroom.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-ink-muted shrink-0 mt-0.5 cyberpunk:text-cyan-400" />
            <div>
              <p className="text-xs font-semibold text-ink-primary">Roster Directory</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Searchable student names, emails, and tabular IDs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-ink-muted shrink-0 mt-0.5 cyberpunk:text-cyan-400" />
            <div>
              <p className="text-xs font-semibold text-ink-primary">Least Privilege</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Strict read-only scopes with no data modification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
