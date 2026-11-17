/**
 * Google Classroom API Type Definitions
 */

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  creationTime?: string;
  updateTime?: string;
  enrollmentCode?: string;
  courseState?: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
}

export interface StudentProfile {
  id: string;
  name?: {
    givenName?: string;
    familyName?: string;
    fullName?: string;
  };
  emailAddress?: string;
  photoUrl?: string;
}

export interface ClassroomStudent {
  courseId: string;
  userId: string;
  profile?: StudentProfile;
}

export interface CoursesApiResponse {
  courses?: ClassroomCourse[];
  nextPageToken?: string;
}

export interface StudentsApiResponse {
  students?: ClassroomStudent[];
  nextPageToken?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
  status?: number;
}
