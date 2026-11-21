'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import { ClassroomCourse } from '@/lib/types';

interface CourseSelectorProps {
  courses: ClassroomCourse[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  onRefreshCourses: () => void;
  isLoading: boolean;
  error: string | null;
}

export function CourseSelector({
  courses,
  selectedCourseId,
  onSelectCourse,
  onRefreshCourses,
  isLoading,
  error,
}: CourseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const filteredCourses = courses.filter((course) => {
    if (!courseSearch.trim()) return true;
    const q = courseSearch.toLowerCase();
    return (
      course.name.toLowerCase().includes(q) ||
      (course.section && course.section.toLowerCase().includes(q)) ||
      (course.room && course.room.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && courses.length > 4) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen, courses.length]);

  const handleSelect = (courseId: string) => {
    onSelectCourse(courseId);
    setIsOpen(false);
    setCourseSearch('');
  };

  const handleCopyEnrollmentCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <section
      id="course-selector"
      aria-label="Course selection"
      className="bg-surface rounded-xl border border-border-subtle p-5 sm:p-6 transition-colors duration-200 cyberpunk:shadow-[0_0_24px_-10px_rgba(0,229,255,0.2)]"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Custom Accessible Course Dropdown */}
        <div className="flex-1 max-w-xl" ref={containerRef}>
          <div className="flex items-center justify-between mb-1.5">
            <label
              id="course-select-label"
              className="text-xs font-semibold text-ink-secondary"
            >
              Active Course
            </label>
            {courses.length > 0 && !isLoading && (
              <span className="text-xs text-ink-muted font-mono tabular-nums">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'} available
              </span>
            )}
          </div>

          {isLoading ? (
            <div
              aria-busy="true"
              aria-label="Loading active courses"
              className="h-11 w-full rounded-lg border border-border-subtle bg-surface-subtle animate-pulse flex items-center px-3.5"
            >
              <div className="h-3.5 w-48 bg-skeleton rounded" />
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                aria-labelledby="course-select-label"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={courses.length === 0}
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full h-11 flex items-center justify-between gap-3 bg-surface border border-border-strong rounded-lg px-3.5 text-left text-sm font-medium text-ink-primary hover:border-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent disabled:bg-surface-subtle disabled:text-ink-muted disabled:border-border-subtle disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
              >
                <span className="truncate">
                  {selectedCourse ? (
                    <>
                      <span>{selectedCourse.name}</span>
                      {selectedCourse.section && (
                        <span className="text-ink-muted font-normal">
                          {' '}
                          · {selectedCourse.section}
                        </span>
                      )}
                    </>
                  ) : (
                    'No active courses found'
                  )}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-muted shrink-0 transition-transform duration-150 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isOpen && courses.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 right-0 mt-1.5 bg-surface border border-border-subtle rounded-xl shadow-lg z-40 overflow-hidden cyberpunk:border-cyan-400/40 cyberpunk:shadow-[0_12px_32px_-8px_rgba(0,229,255,0.25)]"
                  >
                    {courses.length > 4 && (
                      <div className="p-2 border-b border-border-subtle bg-surface-subtle">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={courseSearch}
                            onChange={(e) => setCourseSearch(e.target.value)}
                            placeholder="Filter courses..."
                            className="w-full bg-surface border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    )}

                    <ul
                      role="listbox"
                      aria-labelledby="course-select-label"
                      className="max-h-64 overflow-y-auto py-1 divide-y divide-border-subtle/50"
                    >
                      {filteredCourses.length === 0 ? (
                        <li className="px-3.5 py-4 text-xs text-ink-muted text-center">
                          No courses match &ldquo;{courseSearch}&rdquo;
                        </li>
                      ) : (
                        filteredCourses.map((course) => {
                          const isSelected = course.id === selectedCourseId;
                          return (
                            <li key={course.id} role="option" aria-selected={isSelected}>
                              <button
                                type="button"
                                onClick={() => handleSelect(course.id)}
                                className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-accent-soft text-accent-soft-ink'
                                    : 'text-ink-primary hover:bg-surface-hover'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{course.name}</p>
                                  {(course.section || course.room) && (
                                    <p className="text-xs text-ink-muted truncate mt-0.5">
                                      {[course.section, course.room ? `Room ${course.room}` : '']
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-accent shrink-0" />
                                )}
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2.5 lg:self-end">
          <button
            type="button"
            onClick={onRefreshCourses}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 h-11 px-4 text-xs font-medium text-ink-secondary bg-surface border border-border-subtle hover:bg-surface-hover hover:border-border-strong hover:text-ink-primary rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Courses</span>
          </button>

          {selectedCourse?.alternateLink && (
            <a
              href={selectedCourse.alternateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-11 px-4 text-xs font-semibold text-accent-ink bg-accent hover:bg-accent-hover rounded-lg transition-colors whitespace-nowrap shrink-0 cyberpunk:shadow-[0_0_16px_-4px_rgba(0,229,255,0.5)]"
            >
              <span>Open in Classroom</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Course Metadata Strip */}
      {selectedCourse && !isLoading && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {selectedCourse.section && (
              <>
                <span className="text-ink-secondary font-medium">{selectedCourse.section}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            {selectedCourse.room && (
              <>
                <span>Room {selectedCourse.room}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="font-mono tabular-nums text-ink-muted">
              ID {selectedCourse.id}
            </span>
          </div>

          {selectedCourse.enrollmentCode && (
            <button
              type="button"
              onClick={() => void handleCopyEnrollmentCode(selectedCourse.enrollmentCode!)}
              className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
              title="Copy enrollment code"
            >
              <span>Join code:</span>
              <code className="font-mono tabular-nums font-medium text-ink-primary">
                {selectedCourse.enrollmentCode}
              </code>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-ink-muted" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mt-4 p-3.5 bg-danger-bg border border-danger-border rounded-lg flex items-start justify-between gap-3 text-xs text-danger-ink"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-danger-icon shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger-ink">Unable to load courses</p>
              <p className="mt-0.5 leading-relaxed opacity-90">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefreshCourses}
            className="px-2.5 py-1 text-xs font-medium text-danger-ink bg-surface border border-danger-border rounded-md hover:bg-surface-hover transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
