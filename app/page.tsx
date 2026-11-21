'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MotionConfig, motion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Download,
  GraduationCap,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Search,
  Table as TableIcon,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  clearAccessToken,
} from '@/lib/auth';
import { ClassroomCourse, ClassroomStudent } from '@/lib/types';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AuthGateway } from '@/components/AuthGateway';
import { CourseSelector } from '@/components/CourseSelector';
import { RosterTable, SortDirection, SortField } from '@/components/RosterTable';
import { RosterCards } from '@/components/RosterCards';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

type ViewMode = 'table' | 'cards';

function escapeCsvCell(value: string): string {
  const sanitized = value.replace(/"/g, '""');
  return `"${sanitized}"`;
}

export default function ClassroomRosterPage() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Courses state
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Students state
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // Roster display controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const rosterRequestIdRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /**
   * Fetches the student roster for a given courseId.
   */
  const fetchStudents = useCallback(async (courseId: string, tokenOverride?: string | null) => {
    const requestId = ++rosterRequestIdRef.current;

    if (!courseId) {
      setStudents([]);
      setStudentsError(null);
      setIsLoadingStudents(false);
      return;
    }

    setIsLoadingStudents(true);
    setStudentsError(null);

    try {
      const token = tokenOverride ?? getAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `/api/classroom/students?courseId=${encodeURIComponent(courseId)}`,
        { headers }
      );
      const data = await res.json();

      if (requestId !== rosterRequestIdRef.current) return;

      if (res.status === 401) {
        clearAccessToken();
        setNeedsAuth(true);
        setStudents([]);
        setStudentsError(data.error || 'Your Google session expired. Please sign in again.');
        return;
      }

      if (!res.ok) {
        setStudentsError(data.error || `Failed to load student roster (HTTP ${res.status}).`);
        setStudents([]);
        return;
      }

      setStudents(data.students || []);
    } catch {
      if (requestId !== rosterRequestIdRef.current) return;
      setStudentsError('Network error while connecting to the student roster API.');
      setStudents([]);
    } finally {
      if (requestId === rosterRequestIdRef.current) {
        setIsLoadingStudents(false);
      }
    }
  }, []);

  /**
   * Fetches active courses from /api/classroom/courses and loads the first course's roster.
   */
  const fetchCourses = useCallback(
    async (tokenOverride?: string | null, silentOn401 = false) => {
      setIsLoadingCourses(true);
      setCoursesError(null);

      try {
        const token = tokenOverride ?? getAccessToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/classroom/courses?courseStates=ACTIVE', { headers });
        const data = await res.json();

        if (res.status === 401) {
          clearAccessToken();
          setNeedsAuth(true);
          setCourses([]);
          setSelectedCourseId('');
          setStudents([]);
          if (!silentOn401) {
            setCoursesError(
              data.error || 'Authentication required. Please sign in with Google.'
            );
          }
          return;
        }

        if (!res.ok) {
          setCoursesError(data.error || `Failed to load courses (HTTP ${res.status}).`);
          setCourses([]);
          setSelectedCourseId('');
          setStudents([]);
          return;
        }

        setNeedsAuth(false);
        const courseList: ClassroomCourse[] = data.courses || [];
        setCourses(courseList);

        if (courseList.length > 0) {
          const targetCourseId = courseList[0].id;
          setSelectedCourseId(targetCourseId);
          setSearchQuery('');
          await fetchStudents(targetCourseId, token);
        } else {
          setSelectedCourseId('');
          setStudents([]);
        }
      } catch {
        setCoursesError('Network error while connecting to the Google Classroom courses API.');
        setCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    },
    [fetchStudents]
  );

  // Subscribe to Firebase Auth state on mount
  useEffect(() => {
    let ignore = false;

    const unsubscribe = initAuth(
      (user, token) => {
        if (ignore) return;
        setCurrentUser(user);
        setNeedsAuth(false);
        setIsAuthChecking(false);
        void fetchCourses(token);
      },
      (user) => {
        if (ignore) return;
        setCurrentUser(user);
        setIsAuthChecking(false);
        void fetchCourses(null, true);
      }
    );

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [fetchCourses]);

  // Global "/" keyboard shortcut to focus roster search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        if (searchInputRef.current) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setCoursesError(null);

    try {
      const result = await googleSignIn();
      setCurrentUser(result.user);
      setNeedsAuth(false);
      await fetchCourses(result.accessToken);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Google Sign-In was cancelled or failed. Please try again.';
      setCoursesError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    rosterRequestIdRef.current++;
    setCurrentUser(null);
    setNeedsAuth(true);
    setCourses([]);
    setSelectedCourseId('');
    setStudents([]);
    setCoursesError(null);
    setStudentsError(null);
    setSearchQuery('');
  };

  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    setSearchQuery('');
    void fetchStudents(newCourseId);
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  // Filter and sort students deterministically
  const processedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? students.filter((student) => {
          const fullName = student.profile?.name?.fullName?.toLowerCase() || '';
          const email = student.profile?.emailAddress?.toLowerCase() || '';
          const userId = student.userId?.toLowerCase() || '';
          return fullName.includes(q) || email.includes(q) || userId.includes(q);
        })
      : students;

    return [...filtered].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'name') {
        valA = (a.profile?.name?.fullName || '').toLowerCase();
        valB = (b.profile?.name?.fullName || '').toLowerCase();
      } else if (sortField === 'email') {
        valA = (a.profile?.emailAddress || '').toLowerCase();
        valB = (b.profile?.emailAddress || '').toLowerCase();
      } else {
        valA = a.userId.toLowerCase();
        valB = b.userId.toLowerCase();
      }

      const comparison = valA.localeCompare(valB);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [students, searchQuery, sortField, sortDirection]);

  const handleExportCsv = () => {
    if (!selectedCourse || processedStudents.length === 0) return;

    const header = ['Course Name', 'Course ID', 'Full Name', 'Email Address', 'User ID'];
    const rows = processedStudents.map((s) => [
      escapeCsvCell(selectedCourse.name),
      escapeCsvCell(selectedCourse.id),
      escapeCsvCell(s.profile?.name?.fullName || 'Enrolled Student'),
      escapeCsvCell(s.profile?.emailAddress || ''),
      escapeCsvCell(s.userId),
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const safeCourseSlug = selectedCourse.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeCourseSlug || 'classroom'}-roster.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-canvas text-ink-primary transition-colors duration-200">
        {/* Top Navigation Bar (Strict 3-Zone Contract) */}
        <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-xs border-b border-border-subtle transition-colors duration-200 cyberpunk:border-cyan-400/25">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            {/* Zone 1: Single-line Brand Wordmark */}
            <a
              href="#top"
              className="flex items-center gap-2.5 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-md"
            >
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-ink cyberpunk:shadow-[0_0_14px_-2px_rgba(0,229,255,0.65)]">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-ink-primary whitespace-nowrap shrink-0">
                Classroom Roster
              </span>
            </a>

            {/* Zone 2: Clean Single-Line Nav Links */}
            <nav
              aria-label="Workspace sections"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-secondary"
            >
              <a
                href="#course-selector"
                className="hover:text-ink-primary transition-colors whitespace-nowrap shrink-0"
              >
                Courses
              </a>
              <a
                href="#student-roster"
                className="hover:text-ink-primary transition-colors whitespace-nowrap shrink-0"
              >
                Student Roster
              </a>
            </nav>

            {/* Zone 3: 1 Primary Action */}
            <div className="flex items-center gap-3 shrink-0">
              {needsAuth ? (
                <GoogleSignInButton
                  onClick={handleSignIn}
                  disabled={isSigningIn || isAuthChecking}
                  label={isSigningIn ? 'Connecting...' : 'Sign in with Google'}
                  size="sm"
                />
              ) : currentUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-ink-secondary bg-surface border border-border-subtle hover:bg-surface-hover hover:border-border-strong hover:text-ink-primary rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title={currentUser.email || 'Signed in with Google'}
                >
                  <span className="max-w-[160px] truncate">
                    {currentUser.email || currentUser.displayName || 'Connected'}
                  </span>
                  <LogOut className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void fetchCourses()}
                  disabled={isLoadingCourses || isAuthChecking}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-ink-secondary bg-surface border border-border-subtle hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoadingCourses ? 'animate-spin' : ''}`}
                  />
                  <span>Sync Workspace</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main
          id="top"
          className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
        >
          {needsAuth && !isAuthChecking && !isLoadingCourses ? (
            <div className="space-y-4">
              <div className="max-w-3xl mx-auto flex justify-end">
                <ThemeSwitcher />
              </div>
              <AuthGateway
                onSignIn={handleSignIn}
                isSigningIn={isSigningIn}
                error={coursesError}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Workspace Heading & Theme Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink-primary text-balance">
                    Course Selection &amp; Roster
                  </h1>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Select an active Google Classroom course to inspect its enrolled student
                    roster.
                  </p>
                </div>

                <div className="self-start sm:self-auto">
                  <ThemeSwitcher />
                </div>
              </div>

              {/* Course Selector Control Deck */}
              <CourseSelector
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelectCourse={handleCourseChange}
                onRefreshCourses={() => void fetchCourses()}
                isLoading={isLoadingCourses || isAuthChecking}
                error={coursesError}
              />

              {/* Summary Strip (Single-Elevation, Hairline Dividers) */}
              {!coursesError && (courses.length > 0 || isLoadingCourses) && (
                <section
                  aria-label="Workspace summary metrics"
                  className="bg-surface rounded-xl border border-border-subtle grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle transition-colors duration-200 cyberpunk:shadow-[0_0_24px_-12px_rgba(0,229,255,0.2)]"
                >
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-ink-muted">Active Courses</p>
                    <p className="mt-1 text-xl font-bold text-ink-primary font-mono tabular-nums cyberpunk:text-cyan-300">
                      {isLoadingCourses || isAuthChecking ? '—' : courses.length}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-ink-muted">Enrolled Students</p>
                    <p className="mt-1 text-xl font-bold text-ink-primary font-mono tabular-nums cyberpunk:text-cyan-300">
                      {isLoadingStudents || isLoadingCourses || !selectedCourseId
                        ? '—'
                        : students.length}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-ink-muted">
                      {searchQuery.trim() ? 'Matching Filter' : 'Course Status'}
                    </p>
                    <p className="mt-1 text-xl font-bold text-ink-primary font-mono tabular-nums cyberpunk:text-pink-400">
                      {searchQuery.trim()
                        ? processedStudents.length
                        : selectedCourse?.courseState || '—'}
                    </p>
                  </div>
                </section>
              )}

              {/* Student Roster Panel */}
              <section
                id="student-roster"
                aria-label="Student roster"
                className="bg-surface rounded-xl border border-border-subtle overflow-hidden transition-colors duration-200 cyberpunk:shadow-[0_0_28px_-12px_rgba(0,229,255,0.22)]"
              >
                {/* Roster Toolbar */}
                <div className="px-5 py-4 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Users className="w-4 h-4 text-ink-muted shrink-0 cyberpunk:text-cyan-400" />
                    <h2 className="text-base font-semibold text-ink-primary truncate">
                      {selectedCourse ? selectedCourse.name : 'Student Roster'}
                    </h2>
                    {!isLoadingStudents && selectedCourseId && (
                      <span className="text-xs text-ink-muted font-mono tabular-nums shrink-0">
                        · {processedStudents.length}{' '}
                        {processedStudents.length === 1 ? 'student' : 'students'}
                      </span>
                    )}
                  </div>

                  {/* Interactive Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:flex-none sm:w-64">
                      <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search students... ( / )"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedCourseId || isLoadingStudents}
                        aria-label="Filter student roster"
                        className="w-full h-9 bg-surface-subtle border border-border-subtle rounded-lg pl-8 pr-8 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent focus:bg-surface transition-colors disabled:opacity-50"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search filter"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* View Toggle (Table vs Cards) */}
                    <div
                      role="group"
                      aria-label="Roster layout"
                      className="inline-flex items-center p-0.5 bg-surface-subtle rounded-lg border border-border-subtle"
                    >
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        aria-pressed={viewMode === 'table'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          viewMode === 'table'
                            ? 'bg-surface text-ink-primary shadow-2xs cyberpunk:text-cyan-300'
                            : 'text-ink-muted hover:text-ink-primary'
                        }`}
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        aria-pressed={viewMode === 'cards'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          viewMode === 'cards'
                            ? 'bg-surface text-ink-primary shadow-2xs cyberpunk:text-cyan-300'
                            : 'text-ink-muted hover:text-ink-primary'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </button>
                    </div>

                    {/* Export CSV */}
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={
                        !selectedCourse || isLoadingStudents || processedStudents.length === 0
                      }
                      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-ink-secondary bg-surface border border-border-subtle hover:bg-surface-hover hover:text-ink-primary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>

                    {/* Refresh Roster */}
                    {selectedCourseId && (
                      <button
                        type="button"
                        onClick={() => void fetchStudents(selectedCourseId)}
                        disabled={isLoadingStudents}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-ink-secondary bg-surface border border-border-subtle hover:bg-surface-hover hover:text-ink-primary rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isLoadingStudents ? 'animate-spin' : ''}`}
                        />
                        <span>Refresh</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Roster Error State */}
                {studentsError && (
                  <div className="p-5">
                    <div
                      role="alert"
                      className="p-4 bg-danger-bg border border-danger-border rounded-lg flex items-start justify-between gap-4 text-sm text-danger-ink"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-danger-icon shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-danger-ink">
                            Unable to load student roster
                          </p>
                          <p className="text-xs mt-1 leading-relaxed opacity-90">
                            {studentsError}
                          </p>
                        </div>
                      </div>
                      {selectedCourseId && (
                        <button
                          type="button"
                          onClick={() => void fetchStudents(selectedCourseId)}
                          className="px-3 py-1.5 text-xs font-medium text-danger-ink bg-surface border border-danger-border rounded-md hover:bg-surface-hover transition-colors shrink-0 cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty Course State */}
                {!selectedCourseId &&
                  !isLoadingCourses &&
                  !isAuthChecking &&
                  !coursesError && (
                    <div className="py-16 text-center px-4">
                      <BookOpen className="w-10 h-10 text-ink-muted/50 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-ink-primary">
                        No active courses available
                      </p>
                      <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto leading-relaxed">
                        Your Google account does not currently have any active Google Classroom
                        courses.
                      </p>
                    </div>
                  )}

                {/* Roster Content (Loading Skeletons / Empty / Table or Cards) */}
                {selectedCourseId && !studentsError && (
                  <>
                    {!isLoadingStudents && processedStudents.length === 0 ? (
                      <div className="py-16 text-center px-4">
                        <UserCheck className="w-10 h-10 text-ink-muted/50 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-ink-primary">
                          {searchQuery ? 'No matching students' : 'No students enrolled'}
                        </p>
                        <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                          {searchQuery
                            ? `No students in this course match "${searchQuery}".`
                            : 'This course does not currently have any enrolled students in Google Classroom.'}
                        </p>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-4 px-3.5 py-1.5 text-xs font-medium text-ink-secondary bg-surface-subtle hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors cursor-pointer"
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                    ) : viewMode === 'table' ? (
                      <RosterTable
                        students={processedStudents}
                        isLoading={isLoadingStudents}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    ) : (
                      <RosterCards
                        students={processedStudents}
                        isLoading={isLoadingStudents}
                      />
                    )}
                  </>
                )}
              </section>
            </motion.div>
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-border-subtle py-5 text-center text-xs text-ink-muted transition-colors duration-200">
          Google Classroom Course &amp; Roster Hub
        </footer>
      </div>
    </MotionConfig>
  );
}
