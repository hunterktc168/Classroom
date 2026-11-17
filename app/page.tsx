'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Mail,
  LogOut,
  UserCheck,
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

function GoogleSignInButton({
  onClick,
  disabled,
  label = 'Sign in with Google',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1F1F1F] bg-white border border-[#747775] rounded-md hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
    >
      <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}

function StudentAvatar({ photoUrl, fullName }: { photoUrl?: string; fullName: string }) {
  const [hasError, setHasError] = useState(false);
  const initial = (fullName.trim().charAt(0) || 'S').toUpperCase();

  if (!photoUrl || hasError) {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs border border-emerald-200 shrink-0">
        {initial}
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
      className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
    />
  );
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Guard against out-of-order roster fetch responses
  const rosterRequestIdRef = useRef<number>(0);

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

      // Ignore stale response if user switched courses while request was in flight
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
   * Fetches active courses from /api/classroom/courses and automatically loads
   * the first course's roster if available.
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
        // Probe silently once in case server-side credentials are injected in env
        void fetchCourses(null, true);
      }
    );

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [fetchCourses]);

  // Handle interactive Google Sign-In
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

  // Handle Sign Out
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

  // Handle course selection change
  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    setSearchQuery('');
    void fetchStudents(newCourseId);
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const filteredStudents = students.filter((student) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const fullName = student.profile?.name?.fullName?.toLowerCase() || '';
    const email = student.profile?.emailAddress?.toLowerCase() || '';
    const userId = student.userId?.toLowerCase() || '';
    return fullName.includes(query) || email.includes(query) || userId.includes(query);
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar (3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              Classroom Roster
            </span>
          </div>

          {/* Zone 2: Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="text-slate-900 whitespace-nowrap shrink-0">Courses &amp; Rosters</span>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {needsAuth ? (
              <GoogleSignInButton
                onClick={handleSignIn}
                disabled={isSigningIn || isAuthChecking}
                label={isSigningIn ? 'Connecting...' : 'Sign in with Google'}
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchCourses()}
                  disabled={isLoadingCourses}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCourses ? 'animate-spin' : ''}`} />
                  <span>Refresh Courses</span>
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title={`Sign out (${currentUser.email || currentUser.displayName || 'Google'})`}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Initial Auth / Sign-In Card when Classroom access is needed */}
        {needsAuth && !isAuthChecking && !isLoadingCourses ? (
          <section className="bg-white rounded-xl border border-slate-200 p-8 sm:p-10 text-center max-w-xl mx-auto mt-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 text-balance">
              Connect Your Google Classroom Account
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Sign in with Google to view your active courses and enrolled student rosters directly
              from Google Classroom.
            </p>

            {coursesError && (
              <div className="mt-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-left text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{coursesError}</span>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <GoogleSignInButton
                onClick={handleSignIn}
                disabled={isSigningIn}
                label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              />
            </div>
          </section>
        ) : (
          <>
            {/* Course Selection Bar */}
            <section className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1.5 flex-1 max-w-md">
                  <label
                    htmlFor="course-select"
                    className="block text-xs font-semibold text-slate-600"
                  >
                    Active Course
                  </label>
                  <div className="relative">
                    <select
                      id="course-select"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      disabled={isLoadingCourses || isAuthChecking || courses.length === 0}
                      className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isLoadingCourses || isAuthChecking ? (
                        <option value="">Loading active courses...</option>
                      ) : courses.length === 0 ? (
                        <option value="">No active courses found</option>
                      ) : (
                        courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                            {course.section ? ` — ${course.section}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Course Loading Indicator / Classroom Link */}
                <div className="flex items-center gap-3">
                  {(isLoadingCourses || isAuthChecking) && (
                    <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Fetching courses...</span>
                    </div>
                  )}

                  {selectedCourse?.alternateLink && (
                    <a
                      href={selectedCourse.alternateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Classroom</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Courses API Error Banner */}
              {coursesError && (
                <div
                  role="alert"
                  className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-900"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">Unable to load courses</p>
                    <p className="text-xs text-red-800 mt-0.5">{coursesError}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Selected Course Summary Header */}
            {selectedCourse && (
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                      {selectedCourse.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                      {selectedCourse.section && (
                        <>
                          <span>Section: {selectedCourse.section}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      {selectedCourse.room && (
                        <>
                          <span>Room {selectedCourse.room}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span className="font-mono tabular-nums">ID: {selectedCourse.id}</span>
                      {selectedCourse.enrollmentCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            Enrollment Code:{' '}
                            <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {selectedCourse.enrollmentCode}
                            </code>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Roster Search */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter roster by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Student Roster Table Section */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h2 className="text-base font-semibold text-slate-900">Enrolled Students</h2>
                  {!isLoadingStudents && selectedCourse && (
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      ({filteredStudents.length}{' '}
                      {filteredStudents.length === 1 ? 'student' : 'students'})
                    </span>
                  )}
                </div>

                {selectedCourseId && (
                  <button
                    type="button"
                    onClick={() => void fetchStudents(selectedCourseId)}
                    disabled={isLoadingStudents}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingStudents ? 'animate-spin' : ''}`}
                    />
                    <span>Refresh Roster</span>
                  </button>
                )}
              </div>

              {/* Roster Error Banner */}
              {studentsError && (
                <div className="p-5">
                  <div
                    role="alert"
                    className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-900"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Unable to load student roster</p>
                      <p className="text-xs text-red-800 mt-1">{studentsError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Students State */}
              {isLoadingStudents && (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-slate-500">
                    Fetching student roster from Google Classroom...
                  </p>
                </div>
              )}

              {/* Empty Course Selection State */}
              {!selectedCourseId && !isLoadingCourses && !isAuthChecking && !coursesError && (
                <div className="py-16 text-center px-4">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">No active courses available</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Your Google account does not have any active Google Classroom courses, or select
                    a course from the dropdown above.
                  </p>
                </div>
              )}

              {/* Populated Roster Table */}
              {!isLoadingStudents && !studentsError && selectedCourseId && (
                <div>
                  {filteredStudents.length === 0 ? (
                    <div className="py-16 text-center px-4">
                      <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700">
                        {searchQuery ? 'No matching students found' : 'No students enrolled'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery
                          ? `No student records match "${searchQuery}".`
                          : 'This course does not currently have any enrolled students.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                            <th scope="col" className="py-3 px-5">
                              Student
                            </th>
                            <th scope="col" className="py-3 px-5">
                              Email Address
                            </th>
                            <th scope="col" className="py-3 px-5 text-right font-mono">
                              User ID
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map((student) => {
                            const fullName =
                              student.profile?.name?.fullName || 'Enrolled Student';
                            const email = student.profile?.emailAddress || '—';

                            return (
                              <tr
                                key={student.userId}
                                className="hover:bg-slate-50/70 transition-colors"
                              >
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center gap-3">
                                    <StudentAvatar
                                      photoUrl={student.profile?.photoUrl}
                                      fullName={fullName}
                                    />
                                    <span className="font-medium text-slate-900">{fullName}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-5 text-slate-600">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{email}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-5 text-right font-mono text-xs text-slate-500 tabular-nums">
                                  {student.userId}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Google Classroom Roster Hub
      </footer>
    </div>
  );
}
