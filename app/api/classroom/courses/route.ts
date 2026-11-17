import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessTokenFromRequest,
  fetchFromClassroomApi,
  ClassroomApiError,
} from '@/lib/classroom-server';
import { ClassroomCourse, CoursesApiResponse, ApiErrorResponse } from '@/lib/types';

/**
 * GET /api/classroom/courses
 *
 * Fetches the list of active courses from the Google Classroom API (GET /v1/courses).
 *
 * Expected Request:
 * - Headers: Authorization: Bearer <Google_Access_Token> (or injected server token)
 * - Query Params (optional):
 *   - courseStates: string (defaults to 'ACTIVE')
 *
 * Returns:
 * - 200 OK: { courses: ClassroomCourse[] }
 * - 401 Unauthorized: { error: string, status: 401 }
 * - 403 Forbidden: { error: string, details?: string, status: 403 }
 * - 500 / other: { error: string, details?: string, status: number }
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessTokenFromRequest(req);

    if (!accessToken) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: 'Authentication required. Please sign in with Google to view your Classroom courses.',
          status: 401,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseStates = searchParams.get('courseStates') || 'ACTIVE';

    const allCourses: ClassroomCourse[] = [];
    let pageToken: string | undefined;

    // Fetch paginated courses from Google Classroom API
    do {
      const params = new URLSearchParams({
        courseStates,
        pageSize: '100',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const data = await fetchFromClassroomApi<CoursesApiResponse>(
        `/courses?${params.toString()}`,
        accessToken
      );

      if (data.courses && data.courses.length > 0) {
        allCourses.push(...data.courses);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return NextResponse.json<CoursesApiResponse>({
      courses: allCourses,
    });
  } catch (error: unknown) {
    console.error('Error fetching Google Classroom courses:', error);

    if (error instanceof ClassroomApiError) {
      let message = error.message;
      if (error.status === 403) {
        message =
          'Permission denied (403 Forbidden) when accessing Google Classroom courses. Please verify your Google account has access to Google Classroom and that the required permissions were granted.';
      } else if (error.status === 401) {
        message = 'Your Google Classroom session has expired or is invalid. Please sign in again.';
      }

      return NextResponse.json<ApiErrorResponse>(
        {
          error: message,
          details: error.details,
          status: error.status,
        },
        { status: error.status }
      );
    }

    const fallbackMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while fetching courses.';

    return NextResponse.json<ApiErrorResponse>(
      {
        error: fallbackMessage,
        status: 500,
      },
      { status: 500 }
    );
  }
}
