import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessTokenFromRequest,
  fetchFromClassroomApi,
  ClassroomApiError,
} from '@/lib/classroom-server';
import { ClassroomStudent, StudentsApiResponse, ApiErrorResponse } from '@/lib/types';

/**
 * GET /api/classroom/students
 *
 * Fetches the student roster for a specific Google Classroom course
 * (GET /v1/courses/{courseId}/students).
 *
 * Expected Request:
 * - Headers: Authorization: Bearer <Google_Access_Token> (or injected server token)
 * - Query Params (required):
 *   - courseId: string (e.g. ?courseId=12345678)
 *
 * Returns:
 * - 200 OK: { students: ClassroomStudent[] }
 * - 400 Bad Request: { error: string, status: 400 }
 * - 401 Unauthorized: { error: string, status: 401 }
 * - 403 Forbidden: { error: string, details?: string, status: 403 }
 * - 404 Not Found: { error: string, details?: string, status: 404 }
 * - 500 / other: { error: string, details?: string, status: number }
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessTokenFromRequest(req);

    if (!accessToken) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: 'Authentication required. Please sign in with Google to view course rosters.',
          status: 401,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId')?.trim();

    if (!courseId) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: 'Bad Request: The "courseId" query parameter is required.',
          status: 400,
        },
        { status: 400 }
      );
    }

    const allStudents: ClassroomStudent[] = [];
    let pageToken: string | undefined;

    // Fetch paginated student roster from Google Classroom API
    do {
      const params = new URLSearchParams({
        pageSize: '100',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const data = await fetchFromClassroomApi<StudentsApiResponse>(
        `/courses/${encodeURIComponent(courseId)}/students?${params.toString()}`,
        accessToken
      );

      if (data.students && data.students.length > 0) {
        allStudents.push(...data.students);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return NextResponse.json<StudentsApiResponse>({
      students: allStudents,
    });
  } catch (error: unknown) {
    console.error('Error fetching Google Classroom student roster:', error);

    if (error instanceof ClassroomApiError) {
      let message = error.message;
      if (error.status === 403) {
        message =
          'Permission denied (403 Forbidden). In Google Classroom, viewing student rosters may be restricted to enrolled teachers or domain administrators.';
      } else if (error.status === 404) {
        message = 'The selected course was not found in Google Classroom (404 Not Found).';
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
        : 'An unexpected error occurred while fetching the student roster.';

    return NextResponse.json<ApiErrorResponse>(
      {
        error: fallbackMessage,
        status: 500,
      },
      { status: 500 }
    );
  }
}
