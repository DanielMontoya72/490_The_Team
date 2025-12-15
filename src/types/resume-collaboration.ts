// Temporary types until Supabase types regenerate
// These match the database tables: resume_shares, resume_feedback, resume_share_permissions

export interface ResumeShare {
  id: string;
  resume_id: string;
  user_id: string;
  share_token: string;
  privacy_level: 'anyone_with_link' | 'specific_people';
  allow_comments: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeSharePermission {
  id: string;
  share_id: string;
  reviewer_email: string;
  permission_level: 'view' | 'comment' | 'edit';
  created_at: string;
}

export interface ResumeFeedback {
  id: string;
  resume_id: string;
  share_id: string;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  section_reference: string | null;
  item_reference: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ResumeShareInsert = Omit<ResumeShare, 'id' | 'created_at' | 'updated_at'>;
export type ResumeSharePermissionInsert = Omit<ResumeSharePermission, 'id' | 'created_at'>;
export type ResumeFeedbackInsert = Omit<ResumeFeedback, 'id' | 'created_at' | 'updated_at'>;
