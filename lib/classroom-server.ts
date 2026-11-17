import { NextRequest } from 'next/server';

const CLASSROOM_BASE_URL = 'https://classroom.googleapis.com/v1';

export class ClassroomApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'ClassroomApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Extracts the Google OAuth Access Token from the incoming request Authorization header
 * or from an environment-injected token if present.
 */
export function getAccessTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer' && parts[1]) {
      return parts[1];
    }
    if (parts.length === 1 && parts[0]) {
      return parts[0];
    }
  }

  return (
    process.env.GOOGLE_ACCESS_TOKEN ||
    process.env.GOOGLE_CLASSROOM_TOKEN ||
    process.env.CLASSROOM_ACCESS_TOKEN ||
    null
  );
}

/**
 * Performs an authenticated GET request to the Google Classroom REST API.
 * Throws a structured ClassroomApiError on non-2xx responses.
 */
export async function fetchFromClassroomApi<T>(endpoint: string, accessToken: string): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${CLASSROOM_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const responseText = await response.text();
  let responseData: Record<string, unknown> = {};

  if (responseText) {
    try {
      responseData = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      responseData = { message: responseText };
    }
  }

  if (!response.ok) {
    const apiError = responseData.error as
      | { message?: string; status?: string; code?: number }
      | undefined;
    const errorMessage =
      apiError?.message ||
      (typeof responseData.message === 'string' ? responseData.message : undefined) ||
      `Google Classroom API responded with status ${response.status}`;
    const errorDetails = apiError?.status || (apiError?.code ? String(apiError.code) : undefined);

    throw new ClassroomApiError(errorMessage, response.status, errorDetails);
  }

  return responseData as T;
}
