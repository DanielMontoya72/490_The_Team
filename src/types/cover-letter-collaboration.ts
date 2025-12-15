// Types for cover letter collaboration features
// These match the database tables: cover_letter_shares, cover_letter_feedback, cover_letter_share_permissions

export interface CoverLetterShare {
  id: string;
  cover_letter_id: string;
  user_id: string;
  share_token: string;
  privacy_level: 'anyone_with_link' | 'specific_people';
  allow_comments: boolean;
  is_active: boolean;
  expires_at: string | null;
  review_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverLetterSharePermission {
  id: string;
  share_id: string;
  reviewer_email: string;
  permission_level: 'view' | 'comment' | 'edit';
  created_at: string;
}

export interface CoverLetterFeedback {
  id: string;
  cover_letter_id: string;
  share_id: string;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  section_reference: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CoverLetterShareInsert = Omit<CoverLetterShare, 'id' | 'created_at' | 'updated_at'>;
export type CoverLetterSharePermissionInsert = Omit<CoverLetterSharePermission, 'id' | 'created_at'>;
export type CoverLetterFeedbackInsert = Omit<CoverLetterFeedback, 'id' | 'created_at' | 'updated_at'>;
