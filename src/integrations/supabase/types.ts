export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accountability_engagement: {
        Row: {
          created_at: string | null
          id: string
          impact_score: number | null
          interaction_data: Json | null
          interaction_type: string
          partner_relationship_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact_score?: number | null
          interaction_data?: Json | null
          interaction_type: string
          partner_relationship_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          impact_score?: number | null
          interaction_data?: Json | null
          interaction_type?: string
          partner_relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_engagement_partner_relationship_id_fkey"
            columns: ["partner_relationship_id"]
            isOneToOne: false
            referencedRelation: "accountability_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_partners: {
        Row: {
          check_in_frequency: string | null
          created_at: string | null
          engagement_score: number | null
          id: string
          last_interaction_at: string | null
          partner_id: string
          relationship_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          check_in_frequency?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_interaction_at?: string | null
          partner_id: string
          relationship_type?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          check_in_frequency?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_interaction_at?: string | null
          partner_id?: string
          relationship_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievement_celebrations: {
        Row: {
          achievement_id: string | null
          celebrated_by: string
          celebration_type: string
          created_at: string | null
          id: string
          message: string | null
          progress_share_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          celebrated_by: string
          celebration_type: string
          created_at?: string | null
          id?: string
          message?: string | null
          progress_share_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          celebrated_by?: string
          celebration_type?: string
          created_at?: string | null
          id?: string
          message?: string | null
          progress_share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_celebrations_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "goal_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_celebrations_progress_share_id_fkey"
            columns: ["progress_share_id"]
            isOneToOne: false
            referencedRelation: "progress_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_evaluations: {
        Row: {
          advisor_id: string
          communication_rating: number | null
          created_at: string
          expertise_rating: number | null
          feedback: string | null
          id: string
          overall_rating: number
          session_id: string | null
          user_id: string
          value_rating: number | null
          would_recommend: boolean | null
        }
        Insert: {
          advisor_id: string
          communication_rating?: number | null
          created_at?: string
          expertise_rating?: number | null
          feedback?: string | null
          id?: string
          overall_rating: number
          session_id?: string | null
          user_id: string
          value_rating?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          advisor_id?: string
          communication_rating?: number | null
          created_at?: string
          expertise_rating?: number | null
          feedback?: string | null
          id?: string
          overall_rating?: number
          session_id?: string | null
          user_id?: string
          value_rating?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_evaluations_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "external_advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_messages: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          message_content: string
          read_at: string | null
          sender_type: string
          user_id: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          message_content: string
          read_at?: string | null
          sender_type: string
          user_id: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          message_content?: string
          read_at?: string | null
          sender_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_messages_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "external_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_permissions: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          updated_at: string
          view_cover_letters: boolean | null
          view_goals: boolean | null
          view_interviews: boolean | null
          view_jobs: boolean | null
          view_profile: boolean | null
          view_resume: boolean | null
          view_skills: boolean | null
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          updated_at?: string
          view_cover_letters?: boolean | null
          view_goals?: boolean | null
          view_interviews?: boolean | null
          view_jobs?: boolean | null
          view_profile?: boolean | null
          view_resume?: boolean | null
          view_skills?: boolean | null
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          view_cover_letters?: boolean | null
          view_goals?: boolean | null
          view_interviews?: boolean | null
          view_jobs?: boolean | null
          view_profile?: boolean | null
          view_resume?: boolean | null
          view_skills?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_permissions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "external_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_recommendations: {
        Row: {
          advisor_id: string
          created_at: string
          description: string
          id: string
          impact_rating: number | null
          implemented_at: string | null
          notes: string | null
          priority: string | null
          recommendation_type: string
          session_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          description: string
          id?: string
          impact_rating?: number | null
          implemented_at?: string | null
          notes?: string | null
          priority?: string | null
          recommendation_type: string
          session_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          description?: string
          id?: string
          impact_rating?: number | null
          implemented_at?: string | null
          notes?: string | null
          priority?: string | null
          recommendation_type?: string
          session_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_recommendations_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "external_advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_sessions: {
        Row: {
          advisor_id: string
          amount_charged: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          payment_status: string | null
          scheduled_at: string
          session_summary: string | null
          session_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_id: string
          amount_charged?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          payment_status?: string | null
          scheduled_at: string
          session_summary?: string | null
          session_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_id?: string
          amount_charged?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          payment_status?: string | null
          scheduled_at?: string
          session_summary?: string | null
          session_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_sessions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "external_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_shared_materials: {
        Row: {
          advisor_id: string
          id: string
          material_id: string | null
          material_title: string
          material_type: string
          notes: string | null
          shared_at: string
          user_id: string
        }
        Insert: {
          advisor_id: string
          id?: string
          material_id?: string | null
          material_title: string
          material_type: string
          notes?: string | null
          shared_at?: string
          user_id: string
        }
        Update: {
          advisor_id?: string
          id?: string
          material_id?: string | null
          material_title?: string
          material_type?: string
          notes?: string | null
          shared_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_shared_materials_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "external_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      api_alert_thresholds: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          notification_enabled: boolean | null
          service_name: string
          threshold_unit: string | null
          threshold_value: number
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          service_name: string
          threshold_unit?: string | null
          threshold_value: number
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          service_name?: string
          threshold_unit?: string | null
          threshold_value?: number
        }
        Relationships: []
      }
      api_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_value: number | null
          id: string
          message: string
          resolved_at: string | null
          service_name: string
          severity: string | null
          threshold_value: number | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          message: string
          resolved_at?: string | null
          service_name: string
          severity?: string | null
          threshold_value?: number | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string
          resolved_at?: string | null
          service_name?: string
          severity?: string | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      api_service_registry: {
        Row: {
          base_url: string | null
          created_at: string | null
          daily_quota: number | null
          display_name: string
          fallback_available: boolean | null
          id: string
          is_free_tier: boolean | null
          monthly_quota: number | null
          rate_limit_period: string | null
          rate_limit_requests: number | null
          requires_api_key: boolean | null
          service_name: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string | null
          daily_quota?: number | null
          display_name: string
          fallback_available?: boolean | null
          id?: string
          is_free_tier?: boolean | null
          monthly_quota?: number | null
          rate_limit_period?: string | null
          rate_limit_requests?: number | null
          requires_api_key?: boolean | null
          service_name: string
        }
        Update: {
          base_url?: string | null
          created_at?: string | null
          daily_quota?: number | null
          display_name?: string
          fallback_available?: boolean | null
          id?: string
          is_free_tier?: boolean | null
          monthly_quota?: number | null
          rate_limit_period?: string | null
          rate_limit_requests?: number | null
          requires_api_key?: boolean | null
          service_name?: string
        }
        Relationships: []
      }
      api_usage_daily: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          date: string
          failed_requests: number | null
          fallback_count: number | null
          id: string
          p95_response_time_ms: number | null
          service_name: string
          successful_requests: number | null
          total_requests: number | null
          total_response_time_ms: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date: string
          failed_requests?: number | null
          fallback_count?: number | null
          id?: string
          p95_response_time_ms?: number | null
          service_name: string
          successful_requests?: number | null
          total_requests?: number | null
          total_response_time_ms?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          failed_requests?: number | null
          fallback_count?: number | null
          id?: string
          p95_response_time_ms?: number | null
          service_name?: string
          successful_requests?: number | null
          total_requests?: number | null
          total_response_time_ms?: number | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          fallback_used: boolean | null
          id: string
          method: string | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          service_name: string
          status_code: number | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          fallback_used?: boolean | null
          id?: string
          method?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          service_name: string
          status_code?: number | null
          success: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          fallback_used?: boolean | null
          id?: string
          method?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          service_name?: string
          status_code?: number | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      api_weekly_reports: {
        Row: {
          generated_at: string | null
          id: string
          report_data: Json
          week_end: string
          week_start: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          report_data: Json
          week_end: string
          week_start: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          report_data?: Json
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      app_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          updated_at?: string
          value: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      application_automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      application_checklists: {
        Row: {
          checklist_items: Json
          completion_percentage: number | null
          created_at: string | null
          id: string
          job_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checklist_items?: Json
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          job_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checklist_items?: Json
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          job_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_emails: {
        Row: {
          created_at: string | null
          email_type: Database["public"]["Enums"]["email_type"] | null
          from_email: string | null
          from_name: string | null
          gmail_message_id: string
          id: string
          is_processed: boolean | null
          job_id: string | null
          raw_content: string | null
          received_at: string | null
          snippet: string | null
          subject: string | null
          suggested_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_type?: Database["public"]["Enums"]["email_type"] | null
          from_email?: string | null
          from_name?: string | null
          gmail_message_id: string
          id?: string
          is_processed?: boolean | null
          job_id?: string | null
          raw_content?: string | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          suggested_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_type?: Database["public"]["Enums"]["email_type"] | null
          from_email?: string | null
          from_name?: string | null
          gmail_message_id?: string
          id?: string
          is_processed?: boolean | null
          job_id?: string | null
          raw_content?: string | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          suggested_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_emails_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_materials: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          is_archived: boolean | null
          is_default: boolean | null
          material_type: string
          updated_at: string
          user_id: string
          version_name: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          material_type: string
          updated_at?: string
          user_id: string
          version_name: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          is_archived?: boolean | null
          is_default?: boolean | null
          material_type?: string
          updated_at?: string
          user_id?: string
          version_name?: string
        }
        Relationships: []
      }
      application_metrics: {
        Row: {
          created_at: string
          id: string
          job_id: string
          metric_data: Json | null
          metric_type: string
          metric_value: number | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          metric_data?: Json | null
          metric_type: string
          metric_value?: number | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          metric_data?: Json | null
          metric_type?: string
          metric_value?: number | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_packages: {
        Row: {
          cover_letter_id: string | null
          created_at: string | null
          id: string
          job_id: string
          package_status: string | null
          portfolio_urls: string[] | null
          resume_id: string | null
          scheduled_send_date: string | null
          sent_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_letter_id?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          package_status?: string | null
          portfolio_urls?: string[] | null
          resume_id?: string | null
          scheduled_send_date?: string | null
          sent_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_letter_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          package_status?: string | null
          portfolio_urls?: string[] | null
          resume_id?: string | null
          scheduled_send_date?: string | null
          sent_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_packages_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      application_platforms: {
        Row: {
          applied_via_url: string | null
          created_at: string | null
          email_id: string | null
          id: string
          imported_from_email: boolean | null
          is_primary: boolean | null
          job_id: string | null
          platform_application_id: string | null
          platform_data: Json | null
          platform_name: string
          platform_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_via_url?: string | null
          created_at?: string | null
          email_id?: string | null
          id?: string
          imported_from_email?: boolean | null
          is_primary?: boolean | null
          job_id?: string | null
          platform_application_id?: string | null
          platform_data?: Json | null
          platform_name: string
          platform_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_via_url?: string | null
          created_at?: string | null
          email_id?: string | null
          id?: string
          imported_from_email?: boolean | null
          is_primary?: boolean | null
          job_id?: string | null
          platform_application_id?: string | null
          platform_data?: Json | null
          platform_name?: string
          platform_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_platforms_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "application_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_platforms_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_quality_scores: {
        Row: {
          analysis_details: Json | null
          cover_letter_score: number | null
          created_at: string
          formatting_issues: Json | null
          formatting_score: number | null
          id: string
          improvement_suggestions: Json | null
          job_id: string
          keyword_match_score: number | null
          linkedin_score: number | null
          meets_threshold: boolean | null
          missing_experiences: string[] | null
          missing_keywords: string[] | null
          missing_skills: string[] | null
          overall_score: number
          resume_score: number | null
          score_percentile: number | null
          threshold_value: number | null
          top_score: number | null
          updated_at: string
          user_average_score: number | null
          user_id: string
        }
        Insert: {
          analysis_details?: Json | null
          cover_letter_score?: number | null
          created_at?: string
          formatting_issues?: Json | null
          formatting_score?: number | null
          id?: string
          improvement_suggestions?: Json | null
          job_id: string
          keyword_match_score?: number | null
          linkedin_score?: number | null
          meets_threshold?: boolean | null
          missing_experiences?: string[] | null
          missing_keywords?: string[] | null
          missing_skills?: string[] | null
          overall_score?: number
          resume_score?: number | null
          score_percentile?: number | null
          threshold_value?: number | null
          top_score?: number | null
          updated_at?: string
          user_average_score?: number | null
          user_id: string
        }
        Update: {
          analysis_details?: Json | null
          cover_letter_score?: number | null
          created_at?: string
          formatting_issues?: Json | null
          formatting_score?: number | null
          id?: string
          improvement_suggestions?: Json | null
          job_id?: string
          keyword_match_score?: number | null
          linkedin_score?: number | null
          meets_threshold?: boolean | null
          missing_experiences?: string[] | null
          missing_keywords?: string[] | null
          missing_skills?: string[] | null
          overall_score?: number
          resume_score?: number | null
          score_percentile?: number | null
          threshold_value?: number | null
          top_score?: number | null
          updated_at?: string
          user_average_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_quality_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_question_templates: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          question: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          question: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          question?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      application_timing_analytics: {
        Row: {
          company_size: string | null
          created_at: string
          id: string
          industry: string | null
          is_remote: boolean | null
          job_id: string | null
          outcome: string | null
          response_received: boolean | null
          response_time_hours: number | null
          submission_day_of_week: number | null
          submission_hour: number | null
          submission_timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_remote?: boolean | null
          job_id?: string | null
          outcome?: string | null
          response_received?: boolean | null
          response_time_hours?: number | null
          submission_day_of_week?: number | null
          submission_hour?: number | null
          submission_timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_remote?: boolean | null
          job_id?: string | null
          outcome?: string | null
          response_received?: boolean | null
          response_time_hours?: number | null
          submission_day_of_week?: number | null
          submission_hour?: number | null
          submission_timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_timing_analytics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bls_salary_benchmarks: {
        Row: {
          annual_total_employment: number | null
          created_at: string
          data_source: string | null
          data_year: number
          expires_at: string
          fetched_at: string
          id: string
          location_code: string | null
          location_name: string | null
          mean_salary: number | null
          median_salary: number | null
          occupation_code: string
          occupation_title: string
          percentile_10: number | null
          percentile_25: number | null
          percentile_75: number | null
          percentile_90: number | null
          updated_at: string
        }
        Insert: {
          annual_total_employment?: number | null
          created_at?: string
          data_source?: string | null
          data_year: number
          expires_at?: string
          fetched_at?: string
          id?: string
          location_code?: string | null
          location_name?: string | null
          mean_salary?: number | null
          median_salary?: number | null
          occupation_code: string
          occupation_title: string
          percentile_10?: number | null
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          updated_at?: string
        }
        Update: {
          annual_total_employment?: number | null
          created_at?: string
          data_source?: string | null
          data_year?: number
          expires_at?: string
          fetched_at?: string
          id?: string
          location_code?: string | null
          location_name?: string | null
          mean_salary?: number | null
          median_salary?: number | null
          occupation_code?: string
          occupation_title?: string
          percentile_10?: number | null
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bulk_onboarding_batches: {
        Row: {
          batch_name: string | null
          cohort_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_log: Json | null
          failed_imports: number | null
          id: string
          import_data: Json | null
          organization_id: string
          status: string | null
          successful_imports: number | null
          total_users: number | null
        }
        Insert: {
          batch_name?: string | null
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          failed_imports?: number | null
          id?: string
          import_data?: Json | null
          organization_id: string
          status?: string | null
          successful_imports?: number | null
          total_users?: number | null
        }
        Update: {
          batch_name?: string | null
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_log?: Json | null
          failed_imports?: number | null
          id?: string
          import_data?: Json | null
          organization_id?: string
          status?: string | null
          successful_imports?: number | null
          total_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_onboarding_batches_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "organization_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_onboarding_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_job_links: {
        Row: {
          campaign_id: string
          id: string
          job_id: string
          linked_at: string
          notes: string | null
          outcome: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          job_id: string
          linked_at?: string
          notes?: string | null
          outcome?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          job_id?: string
          linked_at?: string
          notes?: string | null
          outcome?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_job_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "networking_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_job_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          campaign_id: string
          connections_made: number | null
          created_at: string
          id: string
          meetings_scheduled: number | null
          metric_date: string
          opportunities_generated: number | null
          outreach_sent: number | null
          response_rate: number | null
          responses_received: number | null
          updated_at: string
          user_id: string
          variant_a_responses: number | null
          variant_a_sent: number | null
          variant_b_responses: number | null
          variant_b_sent: number | null
        }
        Insert: {
          campaign_id: string
          connections_made?: number | null
          created_at?: string
          id?: string
          meetings_scheduled?: number | null
          metric_date: string
          opportunities_generated?: number | null
          outreach_sent?: number | null
          response_rate?: number | null
          responses_received?: number | null
          updated_at?: string
          user_id: string
          variant_a_responses?: number | null
          variant_a_sent?: number | null
          variant_b_responses?: number | null
          variant_b_sent?: number | null
        }
        Update: {
          campaign_id?: string
          connections_made?: number | null
          created_at?: string
          id?: string
          meetings_scheduled?: number | null
          metric_date?: string
          opportunities_generated?: number | null
          outreach_sent?: number | null
          response_rate?: number | null
          responses_received?: number | null
          updated_at?: string
          user_id?: string
          variant_a_responses?: number | null
          variant_a_sent?: number | null
          variant_b_responses?: number | null
          variant_b_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "networking_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_outreach: {
        Row: {
          campaign_id: string
          contact_company: string | null
          contact_id: string | null
          contact_name: string
          contact_source: string
          contact_title: string | null
          created_at: string
          id: string
          message_content: string | null
          message_variant: string | null
          notes: string | null
          outcome: string | null
          outreach_type: string
          response_content: string | null
          response_date: string | null
          response_received: boolean | null
          sent_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          contact_company?: string | null
          contact_id?: string | null
          contact_name: string
          contact_source?: string
          contact_title?: string | null
          created_at?: string
          id?: string
          message_content?: string | null
          message_variant?: string | null
          notes?: string | null
          outcome?: string | null
          outreach_type?: string
          response_content?: string | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          contact_company?: string | null
          contact_id?: string | null
          contact_name?: string
          contact_source?: string
          contact_title?: string | null
          created_at?: string
          id?: string
          message_content?: string | null
          message_variant?: string | null
          notes?: string | null
          outcome?: string | null
          outreach_type?: string
          response_content?: string | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_outreach_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "networking_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      career_goals: {
        Row: {
          achievable_steps: Json | null
          category: string | null
          completed_at: string | null
          created_at: string
          goal_description: string | null
          goal_title: string
          goal_type: string
          id: string
          measurable_criteria: Json | null
          priority: string | null
          progress_percentage: number | null
          relevant_to: string | null
          specific_metric: string | null
          status: string
          target_date: string | null
          time_bound_milestones: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievable_steps?: Json | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          goal_description?: string | null
          goal_title: string
          goal_type?: string
          id?: string
          measurable_criteria?: Json | null
          priority?: string | null
          progress_percentage?: number | null
          relevant_to?: string | null
          specific_metric?: string | null
          status?: string
          target_date?: string | null
          time_bound_milestones?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievable_steps?: Json | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          goal_description?: string | null
          goal_title?: string
          goal_type?: string
          id?: string
          measurable_criteria?: Json | null
          priority?: string | null
          progress_percentage?: number | null
          relevant_to?: string | null
          specific_metric?: string | null
          status?: string
          target_date?: string | null
          time_bound_milestones?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_path_simulations: {
        Row: {
          created_at: string
          custom_criteria: Json | null
          decision_points: Json | null
          id: string
          job_offer_ids: string[] | null
          lifetime_earnings: Json | null
          probability_distributions: Json | null
          recommendations: Json | null
          simulation_name: string
          simulation_years: number | null
          starting_industry: string | null
          starting_role: string | null
          starting_salary: number | null
          target_roles: Json | null
          trajectories: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_criteria?: Json | null
          decision_points?: Json | null
          id?: string
          job_offer_ids?: string[] | null
          lifetime_earnings?: Json | null
          probability_distributions?: Json | null
          recommendations?: Json | null
          simulation_name: string
          simulation_years?: number | null
          starting_industry?: string | null
          starting_role?: string | null
          starting_salary?: number | null
          target_roles?: Json | null
          trajectories?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_criteria?: Json | null
          decision_points?: Json | null
          id?: string
          job_offer_ids?: string[] | null
          lifetime_earnings?: Json | null
          probability_distributions?: Json | null
          recommendations?: Json | null
          simulation_name?: string
          simulation_years?: number | null
          starting_industry?: string | null
          starting_role?: string | null
          starting_salary?: number | null
          target_roles?: Json | null
          trajectories?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_services_organizations: {
        Row: {
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean | null
          max_users: number | null
          organization_name: string
          organization_type: string
          settings: Json | null
          subscription_tier: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          organization_name: string
          organization_type?: string
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          organization_name?: string
          organization_type?: string
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          category: string | null
          certification_name: string
          certification_number: string | null
          created_at: string | null
          date_earned: string
          document_url: string | null
          does_not_expire: boolean | null
          expiration_date: string | null
          id: string
          issuing_organization: string
          updated_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          category?: string | null
          certification_name: string
          certification_number?: string | null
          created_at?: string | null
          date_earned: string
          document_url?: string | null
          does_not_expire?: boolean | null
          expiration_date?: string | null
          id?: string
          issuing_organization: string
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          category?: string | null
          certification_name?: string
          certification_number?: string | null
          created_at?: string | null
          date_earned?: string
          document_url?: string | null
          does_not_expire?: boolean | null
          expiration_date?: string | null
          id?: string
          issuing_organization?: string
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          cohort_id: string
          created_at: string
          enrollment_date: string | null
          id: string
          notes: string | null
          placement_company: string | null
          placement_date: string | null
          placement_role: string | null
          placement_salary_range: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          notes?: string | null
          placement_company?: string | null
          placement_date?: string | null
          placement_role?: string | null
          placement_salary_range?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          notes?: string | null
          placement_company?: string | null
          placement_date?: string | null
          placement_role?: string | null
          placement_salary_range?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "organization_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_follows: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          job_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_follows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_growth_tracking: {
        Row: {
          analysis_date: string
          company_name: string
          created_at: string | null
          favorited_at: string | null
          growth_indicators: Json | null
          hiring_activity: string | null
          id: string
          industry: string
          is_favorited: boolean | null
          opportunity_score: number | null
          recent_news: Json | null
          user_id: string
        }
        Insert: {
          analysis_date?: string
          company_name: string
          created_at?: string | null
          favorited_at?: string | null
          growth_indicators?: Json | null
          hiring_activity?: string | null
          id?: string
          industry: string
          is_favorited?: boolean | null
          opportunity_score?: number | null
          recent_news?: Json | null
          user_id: string
        }
        Update: {
          analysis_date?: string
          company_name?: string
          created_at?: string | null
          favorited_at?: string | null
          growth_indicators?: Json | null
          hiring_activity?: string | null
          id?: string
          industry?: string
          is_favorited?: boolean | null
          opportunity_score?: number | null
          recent_news?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      company_research: {
        Row: {
          company_profile: Json
          competitive_landscape: string | null
          created_at: string
          id: string
          interview_id: string | null
          job_id: string
          leadership_info: Json | null
          market_position: Json | null
          questions_to_ask: Json | null
          recent_news: Json | null
          social_media: Json | null
          talking_points: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_profile?: Json
          competitive_landscape?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          job_id: string
          leadership_info?: Json | null
          market_position?: Json | null
          questions_to_ask?: Json | null
          recent_news?: Json | null
          social_media?: Json | null
          talking_points?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_profile?: Json
          competitive_landscape?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          job_id?: string
          leadership_info?: Json | null
          market_position?: Json | null
          questions_to_ask?: Json | null
          recent_news?: Json | null
          social_media?: Json | null
          talking_points?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_research_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_research_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitive_analysis: {
        Row: {
          analysis_date: string | null
          competitive_positioning: Json | null
          created_at: string | null
          differentiation_strategies: Json | null
          id: string
          market_positioning: Json | null
          peer_comparison: Json | null
          performance_metrics: Json | null
          recommendations: Json | null
          skill_gaps: Json | null
          user_id: string
        }
        Insert: {
          analysis_date?: string | null
          competitive_positioning?: Json | null
          created_at?: string | null
          differentiation_strategies?: Json | null
          id?: string
          market_positioning?: Json | null
          peer_comparison?: Json | null
          performance_metrics?: Json | null
          recommendations?: Json | null
          skill_gaps?: Json | null
          user_id: string
        }
        Update: {
          analysis_date?: string | null
          competitive_positioning?: Json | null
          created_at?: string | null
          differentiation_strategies?: Json | null
          id?: string
          market_positioning?: Json | null
          peer_comparison?: Json | null
          performance_metrics?: Json | null
          recommendations?: Json | null
          skill_gaps?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      competitive_benchmarks: {
        Row: {
          benchmark_data: Json
          created_at: string | null
          experience_level: string
          id: string
          industry: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          benchmark_data?: Json
          created_at?: string | null
          experience_level: string
          id?: string
          industry: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          benchmark_data?: Json
          created_at?: string | null
          experience_level?: string
          id?: string
          industry?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_audit_logs: {
        Row: {
          action_description: string | null
          action_type: string
          affected_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action_description?: string | null
          action_type: string
          affected_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id: string
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action_description?: string | null
          action_type?: string
          affected_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_discovery_metrics: {
        Row: {
          avg_relevance_score: number | null
          connection_types: Json | null
          connections_made: number | null
          contacts_reached_out: number | null
          created_at: string | null
          id: string
          metric_date: string | null
          response_rate: number | null
          suggestions_generated: number | null
          user_id: string
        }
        Insert: {
          avg_relevance_score?: number | null
          connection_types?: Json | null
          connections_made?: number | null
          contacts_reached_out?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          response_rate?: number | null
          suggestions_generated?: number | null
          user_id: string
        }
        Update: {
          avg_relevance_score?: number | null
          connection_types?: Json | null
          connections_made?: number | null
          contacts_reached_out?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          response_rate?: number | null
          suggestions_generated?: number | null
          user_id?: string
        }
        Relationships: []
      }
      contact_interactions: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          outcome: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          interaction_date?: string
          interaction_type: string
          notes?: string | null
          outcome?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          outcome?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reminders: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          reminder_date: string
          reminder_message: string | null
          reminder_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_date: string
          reminder_message?: string | null
          reminder_type?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_date?: string
          reminder_message?: string | null
          reminder_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_suggestions: {
        Row: {
          birthday: string | null
          connected_at: string | null
          connection_path: Json | null
          connection_type: string
          contact_company: string | null
          contact_location: string | null
          contact_name: string
          contact_title: string | null
          contacted_at: string | null
          created_at: string | null
          diversity_inclusion_tags: string[] | null
          educational_institution: string | null
          email: string | null
          id: string
          linkedin_url: string | null
          mutual_connections: Json | null
          mutual_interests: string[] | null
          phone: string | null
          relevance_score: number | null
          status: string | null
          suggestion_reason: string | null
          target_company: string | null
          target_role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birthday?: string | null
          connected_at?: string | null
          connection_path?: Json | null
          connection_type: string
          contact_company?: string | null
          contact_location?: string | null
          contact_name: string
          contact_title?: string | null
          contacted_at?: string | null
          created_at?: string | null
          diversity_inclusion_tags?: string[] | null
          educational_institution?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          mutual_connections?: Json | null
          mutual_interests?: string[] | null
          phone?: string | null
          relevance_score?: number | null
          status?: string | null
          suggestion_reason?: string | null
          target_company?: string | null
          target_role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birthday?: string | null
          connected_at?: string | null
          connection_path?: Json | null
          connection_type?: string
          contact_company?: string | null
          contact_location?: string | null
          contact_name?: string
          contact_title?: string | null
          contacted_at?: string | null
          created_at?: string | null
          diversity_inclusion_tags?: string[] | null
          educational_institution?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          mutual_connections?: Json | null
          mutual_interests?: string[] | null
          phone?: string | null
          relevance_score?: number | null
          status?: string | null
          suggestion_reason?: string | null
          target_company?: string | null
          target_role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cover_letter_feedback: {
        Row: {
          comment_text: string
          cover_letter_id: string
          created_at: string
          feedback_theme: string | null
          id: string
          implemented_at: string | null
          implemented_in_version: string | null
          resolved_at: string | null
          resolved_by: string | null
          reviewer_email: string
          reviewer_name: string
          section_reference: string | null
          share_id: string
          status: string
          updated_at: string
        }
        Insert: {
          comment_text: string
          cover_letter_id: string
          created_at?: string
          feedback_theme?: string | null
          id?: string
          implemented_at?: string | null
          implemented_in_version?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          reviewer_email: string
          reviewer_name: string
          section_reference?: string | null
          share_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          comment_text?: string
          cover_letter_id?: string
          created_at?: string
          feedback_theme?: string | null
          id?: string
          implemented_at?: string | null
          implemented_in_version?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          reviewer_email?: string
          reviewer_name?: string
          section_reference?: string | null
          share_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_feedback_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letter_feedback_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "cover_letter_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letter_performance: {
        Row: {
          approach_type: string | null
          created_at: string
          effectiveness_score: number | null
          id: string
          job_id: string
          material_id: string
          notes: string | null
          outcome: string | null
          response_date: string | null
          response_received: boolean | null
          sent_at: string | null
          template_style: string | null
          time_to_response_hours: number | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          approach_type?: string | null
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          job_id: string
          material_id: string
          notes?: string | null
          outcome?: string | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          template_style?: string | null
          time_to_response_hours?: number | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          approach_type?: string | null
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          job_id?: string
          material_id?: string
          notes?: string | null
          outcome?: string | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          template_style?: string | null
          time_to_response_hours?: number | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_performance_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letter_performance_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letter_share_permissions: {
        Row: {
          created_at: string
          id: string
          permission_level: string
          reviewer_email: string
          share_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_level?: string
          reviewer_email: string
          share_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_level?: string
          reviewer_email?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_share_permissions_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "cover_letter_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letter_shares: {
        Row: {
          allow_comments: boolean
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          cover_letter_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          privacy_level: string
          review_deadline: string | null
          share_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_comments?: boolean
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cover_letter_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          privacy_level?: string
          review_deadline?: string | null
          share_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_comments?: boolean
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cover_letter_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          privacy_level?: string
          review_deadline?: string | null
          share_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_shares_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letter_templates: {
        Row: {
          content_structure: Json
          created_at: string | null
          customization_settings: Json | null
          id: string
          industry: string | null
          is_shared: boolean | null
          is_system_template: boolean | null
          template_name: string
          template_type: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          content_structure?: Json
          created_at?: string | null
          customization_settings?: Json | null
          id?: string
          industry?: string | null
          is_shared?: boolean | null
          is_system_template?: boolean | null
          template_name: string
          template_type: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          content_structure?: Json
          created_at?: string | null
          customization_settings?: Json | null
          id?: string
          industry?: string | null
          is_shared?: boolean | null
          is_system_template?: boolean | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      dashboard_general_todos: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deadline_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_sent: boolean | null
          job_id: string
          reminder_date: string
          reminder_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          job_id: string
          reminder_date: string
          reminder_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          job_id?: string
          reminder_date?: string
          reminder_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadline_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          achievements: string | null
          created_at: string | null
          degree_type: string
          education_level: string
          field_of_study: string
          gpa: number | null
          graduation_date: string | null
          id: string
          institution_name: string
          is_current: boolean | null
          show_gpa: boolean | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: string | null
          created_at?: string | null
          degree_type: string
          education_level: string
          field_of_study: string
          gpa?: number | null
          graduation_date?: string | null
          id?: string
          institution_name: string
          is_current?: boolean | null
          show_gpa?: boolean | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: string | null
          created_at?: string | null
          degree_type?: string
          education_level?: string
          field_of_study?: string
          gpa?: number | null
          graduation_date?: string | null
          id?: string
          institution_name?: string
          is_current?: boolean | null
          show_gpa?: boolean | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      employment_history: {
        Row: {
          company_name: string
          created_at: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          job_description: string | null
          job_title: string
          location: string | null
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          job_description?: string | null
          job_title: string
          location?: string | null
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          job_description?: string | null
          job_title?: string
          location?: string | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      external_advisors: {
        Row: {
          accepted_at: string | null
          advisor_email: string
          advisor_name: string
          advisor_type: string
          bio: string | null
          company: string | null
          created_at: string
          currency: string | null
          hourly_rate: number | null
          id: string
          invite_token: string | null
          invited_at: string | null
          specialization: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          advisor_email: string
          advisor_name: string
          advisor_type?: string
          bio?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          hourly_rate?: number | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          advisor_email?: string
          advisor_name?: string
          advisor_type?: string
          bio?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          hourly_rate?: number | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      external_certifications: {
        Row: {
          badge_image_url: string | null
          certification_name: string
          certification_type: string | null
          completion_date: string | null
          created_at: string
          expiration_date: string | null
          id: string
          is_verified: boolean | null
          metadata: Json | null
          platform_id: string | null
          platform_name: string
          ranking: string | null
          score: string | null
          show_on_profile: boolean | null
          updated_at: string
          user_id: string
          verification_status: string | null
          verification_url: string | null
        }
        Insert: {
          badge_image_url?: string | null
          certification_name: string
          certification_type?: string | null
          completion_date?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          platform_id?: string | null
          platform_name: string
          ranking?: string | null
          score?: string | null
          show_on_profile?: boolean | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
          verification_url?: string | null
        }
        Update: {
          badge_image_url?: string | null
          certification_name?: string
          certification_type?: string | null
          completion_date?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          platform_id?: string | null
          platform_name?: string
          ranking?: string | null
          score?: string | null
          show_on_profile?: boolean | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_certifications_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "external_skill_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      external_skill_platforms: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean | null
          last_synced_at: string | null
          platform_name: string
          profile_data: Json | null
          profile_url: string | null
          updated_at: string
          user_id: string
          username: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          last_synced_at?: string | null
          platform_name: string
          profile_data?: Json | null
          profile_url?: string | null
          updated_at?: string
          user_id: string
          username: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          last_synced_at?: string | null
          platform_name?: string
          profile_data?: Json | null
          profile_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      family_milestones: {
        Row: {
          achieved_at: string | null
          celebration_message: string | null
          created_at: string
          id: string
          is_public_to_supporters: boolean | null
          milestone_description: string | null
          milestone_title: string
          milestone_type: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          celebration_message?: string | null
          created_at?: string
          id?: string
          is_public_to_supporters?: boolean | null
          milestone_description?: string | null
          milestone_title: string
          milestone_type: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          celebration_message?: string | null
          created_at?: string
          id?: string
          is_public_to_supporters?: boolean | null
          milestone_description?: string | null
          milestone_title?: string
          milestone_type?: string
          user_id?: string
        }
        Relationships: []
      }
      family_sharing_settings: {
        Row: {
          created_at: string
          hide_company_names: boolean | null
          hide_salary_info: boolean | null
          id: string
          share_application_count: boolean | null
          share_detailed_progress: boolean | null
          share_interview_count: boolean | null
          share_milestones: boolean | null
          share_mood_status: boolean | null
          supporter_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hide_company_names?: boolean | null
          hide_salary_info?: boolean | null
          id?: string
          share_application_count?: boolean | null
          share_detailed_progress?: boolean | null
          share_interview_count?: boolean | null
          share_milestones?: boolean | null
          share_mood_status?: boolean | null
          supporter_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hide_company_names?: boolean | null
          hide_salary_info?: boolean | null
          id?: string
          share_application_count?: boolean | null
          share_detailed_progress?: boolean | null
          share_interview_count?: boolean | null
          share_milestones?: boolean | null
          share_mood_status?: boolean | null
          supporter_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_sharing_settings_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "family_supporters"
            referencedColumns: ["id"]
          },
        ]
      }
      family_support_resources: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          resource_category: string
          resource_content: string | null
          resource_description: string | null
          resource_title: string
          resource_type: string
          resource_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          resource_category: string
          resource_content?: string | null
          resource_description?: string | null
          resource_title: string
          resource_type: string
          resource_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          resource_category?: string
          resource_content?: string | null
          resource_description?: string | null
          resource_title?: string
          resource_type?: string
          resource_url?: string | null
        }
        Relationships: []
      }
      family_supporters: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_status: string
          invite_token: string | null
          invited_at: string | null
          last_viewed_at: string | null
          relationship_type: string
          supporter_email: string | null
          supporter_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_status?: string
          invite_token?: string | null
          invited_at?: string | null
          last_viewed_at?: string | null
          relationship_type?: string
          supporter_email?: string | null
          supporter_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_status?: string
          invite_token?: string | null
          invited_at?: string | null
          last_viewed_at?: string | null
          relationship_type?: string
          supporter_email?: string | null
          supporter_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_updates: {
        Row: {
          created_at: string
          id: string
          is_auto_generated: boolean | null
          shared_with_all: boolean | null
          specific_supporters: string[] | null
          update_content: string
          update_title: string
          update_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_auto_generated?: boolean | null
          shared_with_all?: boolean | null
          specific_supporters?: string[] | null
          update_content: string
          update_title: string
          update_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_auto_generated?: boolean | null
          shared_with_all?: boolean | null
          specific_supporters?: string[] | null
          update_content?: string
          update_title?: string
          update_type?: string
          user_id?: string
        }
        Relationships: []
      }
      geocoded_locations: {
        Row: {
          country: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          geocoded_at: string
          id: string
          latitude: number | null
          location_string: string
          longitude: number | null
          timezone: string | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          geocoded_at?: string
          id?: string
          latitude?: number | null
          location_string: string
          longitude?: number | null
          timezone?: string | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          geocoded_at?: string
          id?: string
          latitude?: number | null
          location_string?: string
          longitude?: number | null
          timezone?: string | null
        }
        Relationships: []
      }
      github_integrations: {
        Row: {
          access_token: string
          connected_at: string
          contribution_data: Json | null
          created_at: string
          github_avatar_url: string | null
          github_username: string | null
          id: string
          last_sync_at: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          contribution_data?: Json | null
          created_at?: string
          github_avatar_url?: string | null
          github_username?: string | null
          id?: string
          last_sync_at?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          contribution_data?: Json | null
          created_at?: string
          github_avatar_url?: string | null
          github_username?: string | null
          id?: string
          last_sync_at?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      github_repositories: {
        Row: {
          created_at: string
          description: string | null
          forks_count: number | null
          full_name: string
          html_url: string
          id: string
          is_featured: boolean | null
          is_fork: boolean | null
          language: string | null
          name: string
          open_issues_count: number | null
          pushed_at: string | null
          repo_id: number
          stargazers_count: number | null
          topics: string[] | null
          updated_at: string
          user_id: string
          watchers_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          forks_count?: number | null
          full_name: string
          html_url: string
          id?: string
          is_featured?: boolean | null
          is_fork?: boolean | null
          language?: string | null
          name: string
          open_issues_count?: number | null
          pushed_at?: string | null
          repo_id: number
          stargazers_count?: number | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
          watchers_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          forks_count?: number | null
          full_name?: string
          html_url?: string
          id?: string
          is_featured?: boolean | null
          is_fork?: boolean | null
          language?: string | null
          name?: string
          open_issues_count?: number | null
          pushed_at?: string | null
          repo_id?: number
          stargazers_count?: number | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
          watchers_count?: number | null
        }
        Relationships: []
      }
      gmail_integrations: {
        Row: {
          auto_import_enabled: boolean | null
          created_at: string | null
          gmail_access_token: string | null
          gmail_email: string | null
          gmail_refresh_token: string | null
          id: string
          last_scan_at: string | null
          scan_frequency: Database["public"]["Enums"]["scan_frequency"] | null
          scanning_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_import_enabled?: boolean | null
          created_at?: string | null
          gmail_access_token?: string | null
          gmail_email?: string | null
          gmail_refresh_token?: string | null
          id?: string
          last_scan_at?: string | null
          scan_frequency?: Database["public"]["Enums"]["scan_frequency"] | null
          scanning_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_import_enabled?: boolean | null
          created_at?: string | null
          gmail_access_token?: string | null
          gmail_email?: string | null
          gmail_refresh_token?: string | null
          id?: string
          last_scan_at?: string | null
          scan_frequency?: Database["public"]["Enums"]["scan_frequency"] | null
          scanning_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goal_achievements: {
        Row: {
          achievement_date: string
          achievement_description: string | null
          achievement_title: string
          celebration_notes: string | null
          created_at: string
          goal_id: string
          id: string
          impact_on_career: string | null
          lessons_learned: string | null
          related_job_id: string | null
          user_id: string
        }
        Insert: {
          achievement_date?: string
          achievement_description?: string | null
          achievement_title: string
          celebration_notes?: string | null
          created_at?: string
          goal_id: string
          id?: string
          impact_on_career?: string | null
          lessons_learned?: string | null
          related_job_id?: string | null
          user_id: string
        }
        Update: {
          achievement_date?: string
          achievement_description?: string | null
          achievement_title?: string
          celebration_notes?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          impact_on_career?: string | null
          lessons_learned?: string | null
          related_job_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_achievements_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_insights: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          action_items: Json | null
          created_at: string
          generated_at: string
          id: string
          insight_description: string
          insight_title: string
          insight_type: string
          related_goals: Json | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          action_items?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          insight_description: string
          insight_title: string
          insight_type: string
          related_goals?: Json | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          action_items?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          insight_description?: string
          insight_title?: string
          insight_type?: string
          related_goals?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      goal_progress_tracking: {
        Row: {
          challenges: string | null
          created_at: string
          goal_id: string
          id: string
          milestone_completed: string | null
          next_steps: string | null
          notes: string | null
          progress_percentage: number
          reflection: string | null
          update_date: string
          user_id: string
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          goal_id: string
          id?: string
          milestone_completed?: string | null
          next_steps?: string | null
          notes?: string | null
          progress_percentage: number
          reflection?: string | null
          update_date?: string
          user_id: string
        }
        Update: {
          challenges?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          milestone_completed?: string | null
          next_steps?: string | null
          notes?: string | null
          progress_percentage?: number
          reflection?: string | null
          update_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_tracking_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "career_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_news_suggestions: {
        Row: {
          contact_id: string | null
          contact_source: string | null
          created_at: string | null
          id: string
          news_headline: string
          news_summary: string | null
          news_url: string | null
          relevance_reason: string | null
          shared_at: string | null
          suggested_talking_points: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          contact_source?: string | null
          created_at?: string | null
          id?: string
          news_headline: string
          news_summary?: string | null
          news_url?: string | null
          relevance_reason?: string | null
          shared_at?: string | null
          suggested_talking_points?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          contact_source?: string | null
          created_at?: string | null
          id?: string
          news_headline?: string
          news_summary?: string | null
          news_url?: string | null
          relevance_reason?: string | null
          shared_at?: string | null
          suggested_talking_points?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      industry_response_benchmarks: {
        Row: {
          avg_response_days: number
          company_size: string | null
          id: string
          industry: string
          job_level: string | null
          last_updated: string
          max_response_days: number
          min_response_days: number
          sample_size: number | null
        }
        Insert: {
          avg_response_days: number
          company_size?: string | null
          id?: string
          industry: string
          job_level?: string | null
          last_updated?: string
          max_response_days: number
          min_response_days: number
          sample_size?: number | null
        }
        Update: {
          avg_response_days?: number
          company_size?: string | null
          id?: string
          industry?: string
          job_level?: string | null
          last_updated?: string
          max_response_days?: number
          min_response_days?: number
          sample_size?: number | null
        }
        Relationships: []
      }
      informational_interview_follow_ups: {
        Row: {
          completed_at: string | null
          created_at: string | null
          follow_up_type: string
          id: string
          interview_id: string
          notes: string | null
          response_received: boolean | null
          scheduled_date: string
          sent_at: string | null
          template_content: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          follow_up_type: string
          id?: string
          interview_id: string
          notes?: string | null
          response_received?: boolean | null
          scheduled_date: string
          sent_at?: string | null
          template_content?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          follow_up_type?: string
          id?: string
          interview_id?: string
          notes?: string | null
          response_received?: boolean | null
          scheduled_date?: string
          sent_at?: string | null
          template_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "informational_interview_follow_ups_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "informational_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      informational_interview_job_links: {
        Row: {
          connection_type: string
          created_at: string | null
          id: string
          interview_id: string
          job_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          connection_type: string
          created_at?: string | null
          id?: string
          interview_id: string
          job_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string | null
          id?: string
          interview_id?: string
          job_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "informational_interview_job_links_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "informational_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informational_interview_job_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      informational_interviews: {
        Row: {
          candidate_company: string | null
          candidate_email: string | null
          candidate_linkedin_url: string | null
          candidate_name: string
          candidate_title: string | null
          completed_at: string | null
          created_at: string | null
          follow_up_completed: boolean | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          impact_score: number | null
          insights: string | null
          interview_date: string | null
          job_opportunities_discussed: string[] | null
          key_insights: string | null
          notes: string | null
          outcome: string | null
          outcomes: string | null
          preparation_notes: string | null
          relationship_impact: string | null
          relationship_strength: string | null
          request_date: string | null
          request_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          candidate_company?: string | null
          candidate_email?: string | null
          candidate_linkedin_url?: string | null
          candidate_name: string
          candidate_title?: string | null
          completed_at?: string | null
          created_at?: string | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          impact_score?: number | null
          insights?: string | null
          interview_date?: string | null
          job_opportunities_discussed?: string[] | null
          key_insights?: string | null
          notes?: string | null
          outcome?: string | null
          outcomes?: string | null
          preparation_notes?: string | null
          relationship_impact?: string | null
          relationship_strength?: string | null
          request_date?: string | null
          request_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          candidate_company?: string | null
          candidate_email?: string | null
          candidate_linkedin_url?: string | null
          candidate_name?: string
          candidate_title?: string | null
          completed_at?: string | null
          created_at?: string | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          impact_score?: number | null
          insights?: string | null
          interview_date?: string | null
          job_opportunities_discussed?: string[] | null
          key_insights?: string | null
          notes?: string | null
          outcome?: string | null
          outcomes?: string | null
          preparation_notes?: string | null
          relationship_impact?: string | null
          relationship_strength?: string | null
          request_date?: string | null
          request_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interview_follow_ups: {
        Row: {
          content: string
          created_at: string
          follow_up_type: string
          id: string
          interview_id: string
          notes: string | null
          response_date: string | null
          response_received: boolean | null
          sent_at: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          follow_up_type: string
          id?: string
          interview_id: string
          notes?: string | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          follow_up_type?: string
          id?: string
          interview_id?: string
          notes?: string | null
          response_date?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_follow_ups_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_insights: {
        Row: {
          common_questions: Json | null
          created_at: string | null
          id: string
          interview_formats: Json | null
          interview_process: Json | null
          interviewer_info: Json | null
          job_id: string
          preparation_checklist: Json | null
          preparation_recommendations: Json | null
          success_tips: Json | null
          timeline_expectations: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          common_questions?: Json | null
          created_at?: string | null
          id?: string
          interview_formats?: Json | null
          interview_process?: Json | null
          interviewer_info?: Json | null
          job_id: string
          preparation_checklist?: Json | null
          preparation_recommendations?: Json | null
          success_tips?: Json | null
          timeline_expectations?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          common_questions?: Json | null
          created_at?: string | null
          id?: string
          interview_formats?: Json | null
          interview_process?: Json | null
          interviewer_info?: Json | null
          job_id?: string
          preparation_checklist?: Json | null
          preparation_recommendations?: Json | null
          success_tips?: Json | null
          timeline_expectations?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_question_responses: {
        Row: {
          created_at: string
          difficulty_level: string
          id: string
          interview_id: string | null
          is_practiced: boolean
          job_id: string | null
          question_category: string
          question_text: string
          response_text: string | null
          star_method: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty_level?: string
          id?: string
          interview_id?: string | null
          is_practiced?: boolean
          job_id?: string | null
          question_category: string
          question_text: string
          response_text?: string | null
          star_method?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty_level?: string
          id?: string
          interview_id?: string | null
          is_practiced?: boolean
          job_id?: string | null
          question_category?: string
          question_text?: string
          response_text?: string | null
          star_method?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_question_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_responses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_response_library: {
        Row: {
          companies_used_for: string[] | null
          created_at: string
          current_response: string | null
          effectiveness_score: number | null
          experiences_referenced: string[] | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          question: string
          question_type: string
          skills: string[] | null
          success_count: number | null
          tags: string[] | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          companies_used_for?: string[] | null
          created_at?: string
          current_response?: string | null
          effectiveness_score?: number | null
          experiences_referenced?: string[] | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          question: string
          question_type: string
          skills?: string[] | null
          success_count?: number | null
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          companies_used_for?: string[] | null
          created_at?: string
          current_response?: string | null
          effectiveness_score?: number | null
          experiences_referenced?: string[] | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          question?: string
          question_type?: string
          skills?: string[] | null
          success_count?: number | null
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      interview_response_versions: {
        Row: {
          ai_feedback: string | null
          created_at: string
          feedback_score: number | null
          id: string
          job_id: string | null
          outcome: string | null
          response_id: string
          response_text: string
          version_number: number
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string
          feedback_score?: number | null
          id?: string
          job_id?: string | null
          outcome?: string | null
          response_id: string
          response_text: string
          version_number: number
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string
          feedback_score?: number | null
          id?: string
          job_id?: string | null
          outcome?: string | null
          response_id?: string
          response_text?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_response_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_response_versions_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "interview_response_library"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_success_predictions: {
        Row: {
          actual_outcome: string | null
          company_research_score: number | null
          confidence_level: string
          created_at: string | null
          historical_success_rate: number | null
          id: string
          improvement_recommendations: Json | null
          interview_id: string
          job_id: string
          overall_probability: number
          performance_trend: string | null
          practice_hours_score: number | null
          predicted_outcome: string | null
          prediction_accuracy: number | null
          preparation_score: number | null
          prioritized_actions: Json | null
          role_match_score: number | null
          strength_areas: Json | null
          updated_at: string | null
          user_id: string
          weakness_areas: Json | null
        }
        Insert: {
          actual_outcome?: string | null
          company_research_score?: number | null
          confidence_level?: string
          created_at?: string | null
          historical_success_rate?: number | null
          id?: string
          improvement_recommendations?: Json | null
          interview_id: string
          job_id: string
          overall_probability: number
          performance_trend?: string | null
          practice_hours_score?: number | null
          predicted_outcome?: string | null
          prediction_accuracy?: number | null
          preparation_score?: number | null
          prioritized_actions?: Json | null
          role_match_score?: number | null
          strength_areas?: Json | null
          updated_at?: string | null
          user_id: string
          weakness_areas?: Json | null
        }
        Update: {
          actual_outcome?: string | null
          company_research_score?: number | null
          confidence_level?: string
          created_at?: string | null
          historical_success_rate?: number | null
          id?: string
          improvement_recommendations?: Json | null
          interview_id?: string
          job_id?: string
          overall_probability?: number
          performance_trend?: string | null
          practice_hours_score?: number | null
          predicted_outcome?: string | null
          prediction_accuracy?: number | null
          preparation_score?: number | null
          prioritized_actions?: Json | null
          role_match_score?: number | null
          strength_areas?: Json | null
          updated_at?: string | null
          user_id?: string
          weakness_areas?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_success_predictions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_success_predictions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          interview_date: string
          interview_type: string
          interviewer_email: string | null
          interviewer_name: string | null
          interviewer_phone: string | null
          job_id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          outcome: string | null
          outcome_notes: string | null
          preparation_tasks: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          interview_date: string
          interview_type: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          interviewer_phone?: string | null
          job_id: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          preparation_tasks?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          interview_date?: string
          interview_type?: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          interviewer_phone?: string | null
          job_id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          preparation_tasks?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_application_materials: {
        Row: {
          cover_letter_id: string | null
          created_at: string
          id: string
          job_id: string
          resume_id: string | null
          updated_at: string
        }
        Insert: {
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          resume_id?: string | null
          updated_at?: string
        }
        Update: {
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          resume_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_application_materials_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_application_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_application_materials_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "application_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      job_commute_cache: {
        Row: {
          calculated_at: string
          distance_km: number | null
          duration_minutes: number | null
          id: string
          job_id: string
          route_geometry: string | null
          user_id: string
        }
        Insert: {
          calculated_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          job_id: string
          route_geometry?: string | null
          user_id: string
        }
        Update: {
          calculated_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          job_id?: string
          route_geometry?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_commute_cache_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_competitive_analysis: {
        Row: {
          analysis_summary: string | null
          applicant_estimation_factors: Json | null
          competitive_advantages: Json | null
          competitive_disadvantages: Json | null
          competitive_score: number | null
          created_at: string
          differentiating_strategies: Json | null
          estimated_applicants: number | null
          id: string
          interview_confidence: number | null
          interview_likelihood: string | null
          job_id: string
          mitigation_strategies: Json | null
          priority_reasoning: string | null
          priority_score: number | null
          profile_comparison: Json | null
          typical_hired_profile: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          applicant_estimation_factors?: Json | null
          competitive_advantages?: Json | null
          competitive_disadvantages?: Json | null
          competitive_score?: number | null
          created_at?: string
          differentiating_strategies?: Json | null
          estimated_applicants?: number | null
          id?: string
          interview_confidence?: number | null
          interview_likelihood?: string | null
          job_id: string
          mitigation_strategies?: Json | null
          priority_reasoning?: string | null
          priority_score?: number | null
          profile_comparison?: Json | null
          typical_hired_profile?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          applicant_estimation_factors?: Json | null
          competitive_advantages?: Json | null
          competitive_disadvantages?: Json | null
          competitive_score?: number | null
          created_at?: string
          differentiating_strategies?: Json | null
          estimated_applicants?: number | null
          id?: string
          interview_confidence?: number | null
          interview_likelihood?: string | null
          job_id?: string
          mitigation_strategies?: Json | null
          priority_reasoning?: string | null
          priority_score?: number | null
          profile_comparison?: Json | null
          typical_hired_profile?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_competitive_analysis_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          job_id: string
          name: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          job_id: string
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          job_id?: string
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_match_analyses: {
        Row: {
          created_at: string
          education_score: number | null
          experience_score: number | null
          gaps: Json | null
          id: string
          improvement_suggestions: Json | null
          job_id: string
          match_details: Json | null
          overall_score: number
          skills_score: number | null
          strengths: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          education_score?: number | null
          experience_score?: number | null
          gaps?: Json | null
          id?: string
          improvement_suggestions?: Json | null
          job_id: string
          match_details?: Json | null
          overall_score: number
          skills_score?: number | null
          strengths?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          education_score?: number | null
          experience_score?: number | null
          gaps?: Json | null
          id?: string
          improvement_suggestions?: Json | null
          job_id?: string
          match_details?: Json | null
          overall_score?: number
          skills_score?: number | null
          strengths?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_match_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          adjusted_compensation: number | null
          annual_bonus_percent: number | null
          base_salary: number
          benefits_notes: string | null
          commute_score: number | null
          company_name: string
          cost_of_living_index: number | null
          created_at: string
          culture_fit_score: number | null
          decision_date: string | null
          decline_reason: string | null
          equity_value: number | null
          equity_vesting_years: number | null
          expiration_date: string | null
          growth_opportunity_score: number | null
          health_insurance_value: number | null
          id: string
          job_id: string | null
          job_security_score: number | null
          location: string | null
          offer_date: string | null
          other_benefits_value: number | null
          position_title: string
          pto_days: number | null
          remote_policy: string | null
          retirement_match_percent: number | null
          retirement_max_match: number | null
          scenario_adjustments: Json | null
          signing_bonus: number | null
          status: string
          total_compensation: number | null
          updated_at: string
          user_id: string
          weighted_score: number | null
          work_life_balance_score: number | null
        }
        Insert: {
          adjusted_compensation?: number | null
          annual_bonus_percent?: number | null
          base_salary: number
          benefits_notes?: string | null
          commute_score?: number | null
          company_name: string
          cost_of_living_index?: number | null
          created_at?: string
          culture_fit_score?: number | null
          decision_date?: string | null
          decline_reason?: string | null
          equity_value?: number | null
          equity_vesting_years?: number | null
          expiration_date?: string | null
          growth_opportunity_score?: number | null
          health_insurance_value?: number | null
          id?: string
          job_id?: string | null
          job_security_score?: number | null
          location?: string | null
          offer_date?: string | null
          other_benefits_value?: number | null
          position_title: string
          pto_days?: number | null
          remote_policy?: string | null
          retirement_match_percent?: number | null
          retirement_max_match?: number | null
          scenario_adjustments?: Json | null
          signing_bonus?: number | null
          status?: string
          total_compensation?: number | null
          updated_at?: string
          user_id: string
          weighted_score?: number | null
          work_life_balance_score?: number | null
        }
        Update: {
          adjusted_compensation?: number | null
          annual_bonus_percent?: number | null
          base_salary?: number
          benefits_notes?: string | null
          commute_score?: number | null
          company_name?: string
          cost_of_living_index?: number | null
          created_at?: string
          culture_fit_score?: number | null
          decision_date?: string | null
          decline_reason?: string | null
          equity_value?: number | null
          equity_vesting_years?: number | null
          expiration_date?: string | null
          growth_opportunity_score?: number | null
          health_insurance_value?: number | null
          id?: string
          job_id?: string | null
          job_security_score?: number | null
          location?: string | null
          offer_date?: string | null
          other_benefits_value?: number | null
          position_title?: string
          pto_days?: number | null
          remote_policy?: string | null
          retirement_match_percent?: number | null
          retirement_max_match?: number | null
          scenario_adjustments?: Json | null
          signing_bonus?: number | null
          status?: string
          total_compensation?: number | null
          updated_at?: string
          user_id?: string
          weighted_score?: number | null
          work_life_balance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_search_goals: {
        Row: {
          created_at: string | null
          end_date: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          start_date: string
          target_value: number
          time_period: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          start_date: string
          target_value: number
          time_period: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_value?: number
          time_period?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_status_history: {
        Row: {
          changed_at: string
          from_status: string | null
          id: string
          job_id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string
          from_status?: string | null
          id?: string
          job_id: string
          notes?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string
          from_status?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_todos: {
        Row: {
          category: string
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          job_id: string
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          job_id: string
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          job_id?: string
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_todos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          archive_reason: string | null
          archived_at: string | null
          company_contact_email: string | null
          company_contact_phone: string | null
          company_description: string | null
          company_logo_url: string | null
          company_name: string
          company_rating: number | null
          company_size: string | null
          company_website: string | null
          contact_info: Json | null
          created_at: string
          id: string
          industry: string | null
          interview_notes: string | null
          is_archived: boolean | null
          job_description: string | null
          job_title: string
          job_type: string | null
          job_url: string | null
          linkedin_profile_url: string | null
          location: string | null
          notes: string | null
          platform_count: number | null
          primary_platform: string | null
          salary_negotiation_notes: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_deadline?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          company_contact_email?: string | null
          company_contact_phone?: string | null
          company_description?: string | null
          company_logo_url?: string | null
          company_name: string
          company_rating?: number | null
          company_size?: string | null
          company_website?: string | null
          contact_info?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          interview_notes?: string | null
          is_archived?: boolean | null
          job_description?: string | null
          job_title: string
          job_type?: string | null
          job_url?: string | null
          linkedin_profile_url?: string | null
          location?: string | null
          notes?: string | null
          platform_count?: number | null
          primary_platform?: string | null
          salary_negotiation_notes?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_deadline?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          company_contact_email?: string | null
          company_contact_phone?: string | null
          company_description?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_rating?: number | null
          company_size?: string | null
          company_website?: string | null
          contact_info?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          interview_notes?: string | null
          is_archived?: boolean | null
          job_description?: string | null
          job_title?: string
          job_type?: string | null
          job_url?: string | null
          linkedin_profile_url?: string | null
          location?: string | null
          notes?: string | null
          platform_count?: number | null
          primary_platform?: string | null
          salary_negotiation_notes?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_insights: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          action_items: Json | null
          created_at: string | null
          favorited_at: string | null
          generated_at: string | null
          id: string
          impact_assessment: string | null
          industry: string
          insight_description: string
          insight_title: string
          insight_type: string
          is_favorited: boolean | null
          priority_level: string | null
          recommendations: Json | null
          timeframe: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          action_items?: Json | null
          created_at?: string | null
          favorited_at?: string | null
          generated_at?: string | null
          id?: string
          impact_assessment?: string | null
          industry: string
          insight_description: string
          insight_title: string
          insight_type: string
          is_favorited?: boolean | null
          priority_level?: string | null
          recommendations?: Json | null
          timeframe?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          action_items?: Json | null
          created_at?: string | null
          favorited_at?: string | null
          generated_at?: string | null
          id?: string
          impact_assessment?: string | null
          industry?: string
          insight_description?: string
          insight_title?: string
          insight_type?: string
          is_favorited?: boolean | null
          priority_level?: string | null
          recommendations?: Json | null
          timeframe?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_trends: {
        Row: {
          analysis_date: string
          confidence_score: number | null
          created_at: string | null
          data_sources: Json | null
          favorited_at: string | null
          id: string
          industry: string
          is_favorited: boolean | null
          location: string | null
          trend_data: Json
          trend_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_date?: string
          confidence_score?: number | null
          created_at?: string | null
          data_sources?: Json | null
          favorited_at?: string | null
          id?: string
          industry: string
          is_favorited?: boolean | null
          location?: string | null
          trend_data: Json
          trend_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_date?: string
          confidence_score?: number | null
          created_at?: string | null
          data_sources?: Json | null
          favorited_at?: string | null
          id?: string
          industry?: string
          is_favorited?: boolean | null
          location?: string | null
          trend_data?: Json
          trend_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      material_ab_test_applications: {
        Row: {
          applied_at: string
          created_at: string
          id: string
          job_id: string
          material_id: string
          outcome: string | null
          outcome_date: string | null
          response_time_hours: number | null
          test_id: string
          updated_at: string
          user_id: string
          variant: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          id?: string
          job_id: string
          material_id: string
          outcome?: string | null
          outcome_date?: string | null
          response_time_hours?: number | null
          test_id: string
          updated_at?: string
          user_id: string
          variant: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          id?: string
          job_id?: string
          material_id?: string
          outcome?: string | null
          outcome_date?: string | null
          response_time_hours?: number | null
          test_id?: string
          updated_at?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_ab_test_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_ab_test_applications_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "material_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      material_ab_tests: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          material_type: string
          start_date: string
          status: string
          test_name: string
          updated_at: string
          user_id: string
          variant_a_id: string
          variant_a_name: string
          variant_b_id: string
          variant_b_name: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          material_type: string
          start_date?: string
          status?: string
          test_name: string
          updated_at?: string
          user_id: string
          variant_a_id: string
          variant_a_name: string
          variant_b_id: string
          variant_b_name: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          material_type?: string
          start_date?: string
          status?: string
          test_name?: string
          updated_at?: string
          user_id?: string
          variant_a_id?: string
          variant_a_name?: string
          variant_b_id?: string
          variant_b_name?: string
          winner?: string | null
        }
        Relationships: []
      }
      material_review_impact: {
        Row: {
          application_outcome: string | null
          created_at: string | null
          feedback_implemented_count: number | null
          id: string
          job_id: string | null
          material_id: string
          material_type: string
          outcome_recorded_at: string | null
          review_count: number | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          was_reviewed: boolean | null
        }
        Insert: {
          application_outcome?: string | null
          created_at?: string | null
          feedback_implemented_count?: number | null
          id?: string
          job_id?: string | null
          material_id: string
          material_type: string
          outcome_recorded_at?: string | null
          review_count?: number | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          was_reviewed?: boolean | null
        }
        Update: {
          application_outcome?: string | null
          created_at?: string | null
          feedback_implemented_count?: number | null
          id?: string
          job_id?: string | null
          material_id?: string
          material_type?: string
          outcome_recorded_at?: string | null
          review_count?: number | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          was_reviewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "material_review_impact_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_accountability_milestones: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          due_date: string
          id: string
          mentee_id: string
          mentor_id: string
          milestone_description: string | null
          milestone_title: string
          relationship_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date: string
          id?: string
          mentee_id: string
          mentor_id: string
          milestone_description?: string | null
          milestone_title: string
          relationship_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date?: string
          id?: string
          mentee_id?: string
          mentor_id?: string
          milestone_description?: string | null
          milestone_title?: string
          relationship_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_communications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          read_at: string | null
          receiver_id: string
          relationship_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          read_at?: string | null
          receiver_id: string
          relationship_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          read_at?: string | null
          receiver_id?: string
          relationship_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_communications_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "mentor_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          feedback_type: string
          id: string
          implemented_at: string | null
          mentee_id: string
          mentor_id: string
          priority: string | null
          related_item_id: string | null
          related_item_type: string | null
          relationship_id: string
          review_deadline: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback_text: string
          feedback_type: string
          id?: string
          implemented_at?: string | null
          mentee_id: string
          mentor_id: string
          priority?: string | null
          related_item_id?: string | null
          related_item_type?: string | null
          relationship_id: string
          review_deadline?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback_text?: string
          feedback_type?: string
          id?: string
          implemented_at?: string | null
          mentee_id?: string
          mentor_id?: string
          priority?: string | null
          related_item_id?: string | null
          related_item_type?: string | null
          relationship_id?: string
          review_deadline?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_feedback_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "mentor_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invitation_messages: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
          is_from_mentor: boolean
          is_read: boolean | null
          message_text: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
          is_from_mentor?: boolean
          is_read?: boolean | null
          message_text: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
          is_from_mentor?: boolean
          is_read?: boolean | null
          message_text?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_invitation_messages_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invitation_token: string
          mentor_email: string
          mentor_name: string | null
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invitation_token: string
          mentor_email: string
          mentor_name?: string | null
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          mentor_email?: string
          mentor_name?: string | null
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_progress_reports: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          mentee_id: string
          relationship_id: string
          report_data: Json
          report_period_end: string
          report_period_start: string
          summary: string | null
          viewed_by_mentor_at: string | null
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          mentee_id: string
          relationship_id: string
          report_data?: Json
          report_period_end: string
          report_period_start: string
          summary?: string | null
          viewed_by_mentor_at?: string | null
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          mentee_id?: string
          relationship_id?: string
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          summary?: string | null
          viewed_by_mentor_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_progress_reports_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "mentor_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_relationships: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          mentee_id: string
          mentor_id: string
          permissions: Json
          relationship_type: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          permissions?: Json
          relationship_type?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          permissions?: Json
          relationship_type?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_interview_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          interview_format: string
          interview_id: string | null
          job_id: string | null
          overall_score: number | null
          performance_summary: Json | null
          questions: Json
          session_name: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_format: string
          interview_id?: string | null
          job_id?: string | null
          overall_score?: number | null
          performance_summary?: Json | null
          questions?: Json
          session_name: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_format?: string
          interview_id?: string | null
          job_id?: string | null
          overall_score?: number | null
          performance_summary?: Json | null
          questions?: Json
          session_name?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_sessions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_campaigns: {
        Row: {
          campaign_name: string
          campaign_type: string
          created_at: string
          description: string | null
          end_date: string | null
          goals: Json | null
          id: string
          start_date: string
          status: string
          target_companies: string[] | null
          target_industries: string[] | null
          target_roles: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name: string
          campaign_type?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          start_date: string
          status?: string
          target_companies?: string[] | null
          target_industries?: string[] | null
          target_roles?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          campaign_type?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          start_date?: string
          status?: string
          target_companies?: string[] | null
          target_industries?: string[] | null
          target_roles?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      networking_event_connections: {
        Row: {
          contact_company: string | null
          contact_email: string | null
          contact_id: string | null
          contact_linkedin: string | null
          contact_name: string
          contact_title: string | null
          conversation_notes: string | null
          created_at: string
          event_id: string
          follow_up_completed: boolean | null
          follow_up_date: string | null
          id: string
          relationship_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_company?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_linkedin?: string | null
          contact_name: string
          contact_title?: string | null
          conversation_notes?: string | null
          created_at?: string
          event_id: string
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          relationship_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_company?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_linkedin?: string | null
          contact_name?: string
          contact_title?: string | null
          conversation_notes?: string | null
          created_at?: string
          event_id?: string
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          relationship_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "networking_event_connections_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "networking_event_connections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "networking_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_event_goals: {
        Row: {
          actual_value: number | null
          created_at: string
          event_id: string
          goal_description: string
          goal_type: string
          id: string
          is_achieved: boolean | null
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          event_id: string
          goal_description: string
          goal_type: string
          id?: string
          is_achieved?: boolean | null
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          event_id?: string
          goal_description?: string
          goal_type?: string
          id?: string
          is_achieved?: boolean | null
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "networking_event_goals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "networking_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_opportunities: {
        Row: {
          attended_at: string | null
          created_at: string | null
          diversity_focus: boolean | null
          event_date: string | null
          event_description: string | null
          event_location: string | null
          event_name: string
          event_url: string | null
          id: string
          industry: string | null
          opportunity_type: string
          organizer: string | null
          potential_contacts: Json | null
          registered_at: string | null
          relevance_score: number | null
          speakers: Json | null
          status: string | null
          topics: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          created_at?: string | null
          diversity_focus?: boolean | null
          event_date?: string | null
          event_description?: string | null
          event_location?: string | null
          event_name: string
          event_url?: string | null
          id?: string
          industry?: string | null
          opportunity_type: string
          organizer?: string | null
          potential_contacts?: Json | null
          registered_at?: string | null
          relevance_score?: number | null
          speakers?: Json | null
          status?: string | null
          topics?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attended_at?: string | null
          created_at?: string | null
          diversity_focus?: boolean | null
          event_date?: string | null
          event_description?: string | null
          event_location?: string | null
          event_name?: string
          event_url?: string | null
          id?: string
          industry?: string | null
          opportunity_type?: string
          organizer?: string | null
          potential_contacts?: Json | null
          registered_at?: string | null
          relevance_score?: number | null
          speakers?: Json | null
          status?: string | null
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_admins: {
        Row: {
          admin_role: string
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          permissions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_role?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          permissions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_role?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          permissions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_admins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          accent_color: string | null
          created_at: string
          custom_css: string | null
          custom_domain: string | null
          custom_email_from: string | null
          email_footer_text: string | null
          hide_lovable_branding: boolean | null
          id: string
          landing_page_description: string | null
          landing_page_title: string | null
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_email_from?: string | null
          email_footer_text?: string | null
          hide_lovable_branding?: boolean | null
          id?: string
          landing_page_description?: string | null
          landing_page_title?: string | null
          logo_url?: string | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_email_from?: string | null
          email_footer_text?: string | null
          hide_lovable_branding?: boolean | null
          id?: string
          landing_page_description?: string | null
          landing_page_title?: string | null
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_cohorts: {
        Row: {
          cohort_description: string | null
          cohort_name: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          organization_id: string
          program_type: string | null
          settings: Json | null
          start_date: string | null
          status: string | null
          target_placement_rate: number | null
          updated_at: string
        }
        Insert: {
          cohort_description?: string | null
          cohort_name: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          organization_id: string
          program_type?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          target_placement_rate?: number | null
          updated_at?: string
        }
        Update: {
          cohort_description?: string | null
          cohort_name?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string
          program_type?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          target_placement_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_cohorts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      peer_challenge_participants: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "peer_support_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_discussion_comments: {
        Row: {
          content: string
          created_at: string
          discussion_id: string
          id: string
          is_anonymous: boolean
          likes_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          discussion_id: string
          id?: string
          is_anonymous?: boolean
          likes_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
          is_anonymous?: boolean
          likes_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "peer_support_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_sessions: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number
          facilitator_bio: string | null
          facilitator_name: string | null
          group_id: string
          id: string
          is_recorded: boolean | null
          max_participants: number | null
          meeting_link: string | null
          recording_url: string | null
          registered_count: number | null
          scheduled_at: string
          session_description: string
          session_title: string
          session_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes: number
          facilitator_bio?: string | null
          facilitator_name?: string | null
          group_id: string
          id?: string
          is_recorded?: boolean | null
          max_participants?: number | null
          meeting_link?: string | null
          recording_url?: string | null
          registered_count?: number | null
          scheduled_at: string
          session_description: string
          session_title: string
          session_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number
          facilitator_bio?: string | null
          facilitator_name?: string | null
          group_id?: string
          id?: string
          is_recorded?: boolean | null
          max_participants?: number | null
          meeting_link?: string | null
          recording_url?: string | null
          registered_count?: number | null
          scheduled_at?: string
          session_description?: string
          session_title?: string
          session_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_networking_metrics: {
        Row: {
          challenges_completed: number | null
          challenges_joined: number | null
          comments_made: number | null
          connections_made: number | null
          created_at: string
          discussions_posted: number | null
          groups_joined: number | null
          id: string
          metric_date: string
          referrals_received: number | null
          sessions_attended: number | null
          support_value_rating: number | null
          user_id: string
        }
        Insert: {
          challenges_completed?: number | null
          challenges_joined?: number | null
          comments_made?: number | null
          connections_made?: number | null
          created_at?: string
          discussions_posted?: number | null
          groups_joined?: number | null
          id?: string
          metric_date?: string
          referrals_received?: number | null
          sessions_attended?: number | null
          support_value_rating?: number | null
          user_id: string
        }
        Update: {
          challenges_completed?: number | null
          challenges_joined?: number | null
          comments_made?: number | null
          connections_made?: number | null
          created_at?: string
          discussions_posted?: number | null
          groups_joined?: number | null
          id?: string
          metric_date?: string
          referrals_received?: number | null
          sessions_attended?: number | null
          support_value_rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      peer_referrals: {
        Row: {
          application_url: string | null
          company_name: string
          created_at: string
          expires_at: string | null
          group_id: string
          id: string
          interested_count: number | null
          is_active: boolean
          is_remote: boolean | null
          location: string | null
          posted_by: string
          referral_contact: string | null
          role_description: string | null
          role_title: string
          salary_range: string | null
          updated_at: string
        }
        Insert: {
          application_url?: string | null
          company_name: string
          created_at?: string
          expires_at?: string | null
          group_id: string
          id?: string
          interested_count?: number | null
          is_active?: boolean
          is_remote?: boolean | null
          location?: string | null
          posted_by: string
          referral_contact?: string | null
          role_description?: string | null
          role_title: string
          salary_range?: string | null
          updated_at?: string
        }
        Update: {
          application_url?: string | null
          company_name?: string
          created_at?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          interested_count?: number | null
          is_active?: boolean
          is_remote?: boolean | null
          location?: string | null
          posted_by?: string
          referral_contact?: string | null
          role_description?: string | null
          role_title?: string
          salary_range?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_referrals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_session_registrations: {
        Row: {
          attended: boolean | null
          id: string
          registered_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          id?: string
          registered_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          id?: string
          registered_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_session_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "peer_group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_success_stories: {
        Row: {
          advice_for_others: string | null
          comments_count: number | null
          company_name: string | null
          created_at: string
          group_id: string
          id: string
          is_anonymous: boolean
          key_learnings: string | null
          likes_count: number | null
          role_title: string | null
          story_content: string
          story_title: string
          success_type: string
          timeframe_weeks: number | null
          user_id: string
        }
        Insert: {
          advice_for_others?: string | null
          comments_count?: number | null
          company_name?: string | null
          created_at?: string
          group_id: string
          id?: string
          is_anonymous?: boolean
          key_learnings?: string | null
          likes_count?: number | null
          role_title?: string | null
          story_content: string
          story_title: string
          success_type: string
          timeframe_weeks?: number | null
          user_id: string
        }
        Update: {
          advice_for_others?: string | null
          comments_count?: number | null
          company_name?: string | null
          created_at?: string
          group_id?: string
          id?: string
          is_anonymous?: boolean
          key_learnings?: string | null
          likes_count?: number | null
          role_title?: string | null
          story_content?: string
          story_title?: string
          success_type?: string
          timeframe_weeks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_success_stories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_support_challenges: {
        Row: {
          challenge_description: string
          challenge_name: string
          challenge_type: string
          created_at: string
          created_by: string
          end_date: string
          group_id: string
          id: string
          is_active: boolean
          participants_count: number | null
          start_date: string
          target_metric: string
          target_value: number
          updated_at: string
        }
        Insert: {
          challenge_description: string
          challenge_name: string
          challenge_type: string
          created_at?: string
          created_by: string
          end_date: string
          group_id: string
          id?: string
          is_active?: boolean
          participants_count?: number | null
          start_date: string
          target_metric: string
          target_value: number
          updated_at?: string
        }
        Update: {
          challenge_description?: string
          challenge_name?: string
          challenge_type?: string
          created_at?: string
          created_by?: string
          end_date?: string
          group_id?: string
          id?: string
          is_active?: boolean
          participants_count?: number | null
          start_date?: string
          target_metric?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_support_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_support_discussions: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          group_id: string
          id: string
          is_anonymous: boolean
          is_pinned: boolean | null
          likes_count: number | null
          post_type: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean | null
          likes_count?: number | null
          post_type?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean | null
          likes_count?: number | null
          post_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_support_discussions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_support_group_members: {
        Row: {
          group_id: string
          id: string
          is_anonymous: boolean
          joined_at: string
          notification_preferences: Json | null
          participation_score: number | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_anonymous?: boolean
          joined_at?: string
          notification_preferences?: Json | null
          participation_score?: number | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_anonymous?: boolean
          joined_at?: string
          notification_preferences?: Json | null
          participation_score?: number | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_support_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_support_groups: {
        Row: {
          created_at: string
          created_by: string
          experience_level: string | null
          group_description: string | null
          group_name: string
          group_rules: string | null
          group_type: string
          id: string
          industry: string | null
          is_active: boolean
          location: string | null
          max_members: number | null
          member_count: number
          privacy_level: string
          role_focus: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          experience_level?: string | null
          group_description?: string | null
          group_name: string
          group_rules?: string | null
          group_type: string
          id?: string
          industry?: string | null
          is_active?: boolean
          location?: string | null
          max_members?: number | null
          member_count?: number
          privacy_level?: string
          role_focus?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          experience_level?: string | null
          group_description?: string | null
          group_name?: string
          group_rules?: string | null
          group_type?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          location?: string | null
          max_members?: number | null
          member_count?: number
          privacy_level?: string
          role_focus?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_application_imports: {
        Row: {
          company_name: string | null
          created_at: string | null
          duplicate_of_job_id: string | null
          extracted_data: Json | null
          id: string
          job_title: string | null
          location: string | null
          matched_job_id: string | null
          platform_name: string
          resolved_at: string | null
          source_email_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          duplicate_of_job_id?: string | null
          extracted_data?: Json | null
          id?: string
          job_title?: string | null
          location?: string | null
          matched_job_id?: string | null
          platform_name: string
          resolved_at?: string | null
          source_email_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          duplicate_of_job_id?: string | null
          extracted_data?: Json | null
          id?: string
          job_title?: string | null
          location?: string | null
          matched_job_id?: string | null
          platform_name?: string
          resolved_at?: string | null
          source_email_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_application_imports_duplicate_of_job_id_fkey"
            columns: ["duplicate_of_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_application_imports_matched_job_id_fkey"
            columns: ["matched_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_application_imports_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "application_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_email_rules: {
        Row: {
          created_at: string | null
          extraction_rules: Json | null
          id: string
          is_active: boolean | null
          platform_name: string
          sender_email_pattern: string
          subject_pattern: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extraction_rules?: Json | null
          id?: string
          is_active?: boolean | null
          platform_name: string
          sender_email_pattern: string
          subject_pattern?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          extraction_rules?: Json | null
          id?: string
          is_active?: boolean | null
          platform_name?: string
          sender_email_pattern?: string
          subject_pattern?: string | null
          user_id?: string
        }
        Relationships: []
      }
      productivity_insights: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          created_at: string | null
          id: string
          insight_description: string
          insight_title: string
          insight_type: string
          priority: string | null
          recommendations: Json | null
          user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          created_at?: string | null
          id?: string
          insight_description: string
          insight_title: string
          insight_type: string
          priority?: string | null
          recommendations?: Json | null
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          created_at?: string | null
          id?: string
          insight_description?: string
          insight_title?: string
          insight_type?: string
          priority?: string | null
          recommendations?: Json | null
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      productivity_metrics: {
        Row: {
          activities_breakdown: Json | null
          average_energy_level: number | null
          average_productivity_rating: number | null
          burnout_risk_score: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          metric_date: string
          outcomes_generated: Json | null
          peak_productivity_hour: number | null
          tasks_completed: number | null
          tasks_planned: number | null
          total_time_minutes: number | null
          updated_at: string | null
          user_id: string
          work_life_balance_score: number | null
        }
        Insert: {
          activities_breakdown?: Json | null
          average_energy_level?: number | null
          average_productivity_rating?: number | null
          burnout_risk_score?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          outcomes_generated?: Json | null
          peak_productivity_hour?: number | null
          tasks_completed?: number | null
          tasks_planned?: number | null
          total_time_minutes?: number | null
          updated_at?: string | null
          user_id: string
          work_life_balance_score?: number | null
        }
        Update: {
          activities_breakdown?: Json | null
          average_energy_level?: number | null
          average_productivity_rating?: number | null
          burnout_risk_score?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          outcomes_generated?: Json | null
          peak_productivity_hour?: number | null
          tasks_completed?: number | null
          tasks_planned?: number | null
          total_time_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          work_life_balance_score?: number | null
        }
        Relationships: []
      }
      professional_contacts: {
        Row: {
          birthday: string | null
          company_id: string | null
          contact_frequency: string | null
          created_at: string | null
          current_company: string | null
          current_title: string | null
          email: string | null
          first_name: string
          how_we_met: string | null
          id: string
          industry: string | null
          job_opportunities: string[] | null
          last_contacted_at: string | null
          last_name: string
          last_opportunity_date: string | null
          linkedin_url: string | null
          location: string | null
          mutual_connections: string[] | null
          next_followup_date: string | null
          opportunities_generated: number | null
          personal_interests: string | null
          phone: string | null
          professional_notes: string | null
          relationship_strength: string | null
          relationship_type: string | null
          shared_interests: string[] | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birthday?: string | null
          company_id?: string | null
          contact_frequency?: string | null
          created_at?: string | null
          current_company?: string | null
          current_title?: string | null
          email?: string | null
          first_name: string
          how_we_met?: string | null
          id?: string
          industry?: string | null
          job_opportunities?: string[] | null
          last_contacted_at?: string | null
          last_name: string
          last_opportunity_date?: string | null
          linkedin_url?: string | null
          location?: string | null
          mutual_connections?: string[] | null
          next_followup_date?: string | null
          opportunities_generated?: number | null
          personal_interests?: string | null
          phone?: string | null
          professional_notes?: string | null
          relationship_strength?: string | null
          relationship_type?: string | null
          shared_interests?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birthday?: string | null
          company_id?: string | null
          contact_frequency?: string | null
          created_at?: string | null
          current_company?: string | null
          current_title?: string | null
          email?: string | null
          first_name?: string
          how_we_met?: string | null
          id?: string
          industry?: string | null
          job_opportunities?: string[] | null
          last_contacted_at?: string | null
          last_name?: string
          last_opportunity_date?: string | null
          linkedin_url?: string | null
          location?: string | null
          mutual_connections?: string[] | null
          next_followup_date?: string | null
          opportunities_generated?: number | null
          personal_interests?: string | null
          phone?: string | null
          professional_notes?: string | null
          relationship_strength?: string | null
          relationship_type?: string | null
          shared_interests?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      professional_references: {
        Row: {
          availability_status: string | null
          created_at: string
          how_you_know: string | null
          id: string
          is_active: boolean | null
          last_contacted_at: string | null
          last_used_at: string | null
          linkedin_url: string | null
          notes: string | null
          preferred_contact_method: string | null
          reference_company: string | null
          reference_email: string | null
          reference_name: string
          reference_phone: string | null
          reference_strength: string | null
          reference_title: string | null
          relationship_duration: string | null
          relationship_type: string
          skills_they_can_speak_to: Json | null
          talking_points: Json | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          availability_status?: string | null
          created_at?: string
          how_you_know?: string | null
          id?: string
          is_active?: boolean | null
          last_contacted_at?: string | null
          last_used_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          preferred_contact_method?: string | null
          reference_company?: string | null
          reference_email?: string | null
          reference_name: string
          reference_phone?: string | null
          reference_strength?: string | null
          reference_title?: string | null
          relationship_duration?: string | null
          relationship_type?: string
          skills_they_can_speak_to?: Json | null
          talking_points?: Json | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          availability_status?: string | null
          created_at?: string
          how_you_know?: string | null
          id?: string
          is_active?: boolean | null
          last_contacted_at?: string | null
          last_used_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          preferred_contact_method?: string | null
          reference_company?: string | null
          reference_email?: string | null
          reference_name?: string
          reference_phone?: string | null
          reference_strength?: string | null
          reference_title?: string | null
          relationship_duration?: string | null
          relationship_type?: string
          skills_they_can_speak_to?: Json | null
          talking_points?: Json | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      program_analytics: {
        Row: {
          active_users: number | null
          avg_applications_per_user: number | null
          avg_interviews_per_user: number | null
          avg_time_to_placement_days: number | null
          cohort_id: string | null
          created_at: string
          engagement_score: number | null
          id: string
          metrics_breakdown: Json | null
          organization_id: string
          placement_rate: number | null
          placements: number | null
          snapshot_date: string
          total_applications: number | null
          total_interviews: number | null
          total_users: number | null
        }
        Insert: {
          active_users?: number | null
          avg_applications_per_user?: number | null
          avg_interviews_per_user?: number | null
          avg_time_to_placement_days?: number | null
          cohort_id?: string | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          metrics_breakdown?: Json | null
          organization_id: string
          placement_rate?: number | null
          placements?: number | null
          snapshot_date?: string
          total_applications?: number | null
          total_interviews?: number | null
          total_users?: number | null
        }
        Update: {
          active_users?: number | null
          avg_applications_per_user?: number | null
          avg_interviews_per_user?: number | null
          avg_time_to_placement_days?: number | null
          cohort_id?: string | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          metrics_breakdown?: Json | null
          organization_id?: string
          placement_rate?: number | null
          placements?: number | null
          snapshot_date?: string
          total_applications?: number | null
          total_interviews?: number | null
          total_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_analytics_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "organization_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      program_outcomes: {
        Row: {
          avg_starting_salary: number | null
          cohort_id: string | null
          cost_per_placement: number | null
          created_at: string
          employer_satisfaction_score: number | null
          id: string
          notes: string | null
          organization_id: string
          outcome_period_end: string | null
          outcome_period_start: string | null
          participant_satisfaction_score: number | null
          placed_participants: number | null
          program_cost: number | null
          retention_rate_90_days: number | null
          roi_percentage: number | null
          salary_increase_percentage: number | null
          total_participants: number | null
          updated_at: string
        }
        Insert: {
          avg_starting_salary?: number | null
          cohort_id?: string | null
          cost_per_placement?: number | null
          created_at?: string
          employer_satisfaction_score?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          outcome_period_end?: string | null
          outcome_period_start?: string | null
          participant_satisfaction_score?: number | null
          placed_participants?: number | null
          program_cost?: number | null
          retention_rate_90_days?: number | null
          roi_percentage?: number | null
          salary_increase_percentage?: number | null
          total_participants?: number | null
          updated_at?: string
        }
        Update: {
          avg_starting_salary?: number | null
          cohort_id?: string | null
          cost_per_placement?: number | null
          created_at?: string
          employer_satisfaction_score?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          outcome_period_end?: string | null
          outcome_period_start?: string | null
          participant_satisfaction_score?: number | null
          placed_participants?: number | null
          program_cost?: number | null
          retention_rate_90_days?: number | null
          roi_percentage?: number | null
          salary_increase_percentage?: number | null
          total_participants?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_outcomes_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "organization_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "career_services_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_shares: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          reaction_count: number | null
          share_type: string
          shared_with_id: string | null
          team_id: string | null
          user_id: string
          view_count: number | null
          visibility: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          reaction_count?: number | null
          share_type: string
          shared_with_id?: string | null
          team_id?: string | null
          user_id: string
          view_count?: number | null
          visibility?: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          reaction_count?: number | null
          share_type?: string
          shared_with_id?: string | null
          team_id?: string | null
          user_id?: string
          view_count?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_shares_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_sharing_settings: {
        Row: {
          allowed_viewers: Json | null
          created_at: string | null
          id: string
          share_achievements: boolean | null
          share_goals: boolean | null
          share_interviews: boolean | null
          share_job_applications: boolean | null
          share_resume_updates: boolean | null
          share_technical_prep: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_viewers?: Json | null
          created_at?: string | null
          id?: string
          share_achievements?: boolean | null
          share_goals?: boolean | null
          share_interviews?: boolean | null
          share_job_applications?: boolean | null
          share_resume_updates?: boolean | null
          share_technical_prep?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_viewers?: Json | null
          created_at?: string | null
          id?: string
          share_achievements?: boolean | null
          share_goals?: boolean | null
          share_interviews?: boolean | null
          share_job_applications?: boolean | null
          share_resume_updates?: boolean | null
          share_technical_prep?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string
          end_date: string | null
          id: string
          industry: string | null
          media_urls: string[] | null
          outcomes: string | null
          project_name: string
          project_type: string | null
          project_url: string | null
          repository_link: string | null
          role: string
          start_date: string
          status: string | null
          team_size: number | null
          technologies: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          end_date?: string | null
          id?: string
          industry?: string | null
          media_urls?: string[] | null
          outcomes?: string | null
          project_name: string
          project_type?: string | null
          project_url?: string | null
          repository_link?: string | null
          role: string
          start_date: string
          status?: string | null
          team_size?: number | null
          technologies?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          end_date?: string | null
          id?: string
          industry?: string | null
          media_urls?: string[] | null
          outcomes?: string | null
          project_name?: string
          project_type?: string | null
          project_url?: string | null
          repository_link?: string | null
          role?: string
          start_date?: string
          status?: string | null
          team_size?: number | null
          technologies?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quality_score_history: {
        Row: {
          change_description: string | null
          change_type: string | null
          id: string
          job_id: string
          recorded_at: string
          score: number
          user_id: string
        }
        Insert: {
          change_description?: string | null
          change_type?: string | null
          id?: string
          job_id: string
          recorded_at?: string
          score: number
          user_id: string
        }
        Update: {
          change_description?: string | null
          change_type?: string | null
          id?: string
          job_id?: string
          recorded_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_score_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_appreciation: {
        Row: {
          appreciation_date: string
          appreciation_type: string
          created_at: string
          id: string
          message_content: string | null
          notes: string | null
          reference_id: string
          user_id: string
        }
        Insert: {
          appreciation_date?: string
          appreciation_type: string
          created_at?: string
          id?: string
          message_content?: string | null
          notes?: string | null
          reference_id: string
          user_id: string
        }
        Update: {
          appreciation_date?: string
          appreciation_type?: string
          created_at?: string
          id?: string
          message_content?: string | null
          notes?: string | null
          reference_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_appreciation_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "professional_references"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_portfolios: {
        Row: {
          career_goal: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          portfolio_name: string
          reference_ids: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          career_goal?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          portfolio_name: string
          reference_ids?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          career_goal?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          portfolio_name?: string
          reference_ids?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reference_requests: {
        Row: {
          company_name: string | null
          created_at: string
          deadline: string | null
          feedback_received_at: string | null
          id: string
          job_id: string | null
          outcome: string | null
          outcome_notes: string | null
          preparation_materials: Json | null
          reference_feedback: string | null
          reference_id: string
          request_date: string
          request_status: string | null
          request_type: string | null
          role_title: string | null
          talking_points_sent: Json | null
          thank_you_sent: boolean | null
          thank_you_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          deadline?: string | null
          feedback_received_at?: string | null
          id?: string
          job_id?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          preparation_materials?: Json | null
          reference_feedback?: string | null
          reference_id: string
          request_date?: string
          request_status?: string | null
          request_type?: string | null
          role_title?: string | null
          talking_points_sent?: Json | null
          thank_you_sent?: boolean | null
          thank_you_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          deadline?: string | null
          feedback_received_at?: string | null
          id?: string
          job_id?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          preparation_materials?: Json | null
          reference_feedback?: string | null
          reference_id?: string
          request_date?: string
          request_status?: string | null
          request_type?: string | null
          role_title?: string | null
          talking_points_sent?: Json | null
          thank_you_sent?: boolean | null
          thank_you_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_requests_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "professional_references"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_requests: {
        Row: {
          contact_id: string
          created_at: string
          follow_up_count: number | null
          followed_up_at: string | null
          gratitude_expressed: boolean | null
          gratitude_sent_at: string | null
          id: string
          job_id: string | null
          last_follow_up_message: string | null
          outcome: string | null
          outcome_notes: string | null
          referral_effectiveness_score: number | null
          request_message: string | null
          request_template_type: string | null
          requested_at: string | null
          response_received_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          follow_up_count?: number | null
          followed_up_at?: string | null
          gratitude_expressed?: boolean | null
          gratitude_sent_at?: string | null
          id?: string
          job_id?: string | null
          last_follow_up_message?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          referral_effectiveness_score?: number | null
          request_message?: string | null
          request_template_type?: string | null
          requested_at?: string | null
          response_received_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          follow_up_count?: number | null
          followed_up_at?: string | null
          gratitude_expressed?: boolean | null
          gratitude_sent_at?: string | null
          id?: string
          job_id?: string | null
          last_follow_up_message?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          referral_effectiveness_score?: number | null
          request_message?: string | null
          request_template_type?: string | null
          requested_at?: string | null
          response_received_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_activities: {
        Row: {
          activity_date: string | null
          activity_type: string
          contact_id: string | null
          created_at: string | null
          direction: string | null
          id: string
          metadata: Json | null
          notes: string | null
          user_id: string
          value_provided: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_type: string
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          user_id: string
          value_provided?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          contact_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          user_id?: string
          value_provided?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_health_metrics: {
        Row: {
          contact_id: string | null
          created_at: string | null
          engagement_level: string | null
          health_score: number | null
          health_status: string | null
          id: string
          interaction_count: number | null
          interaction_frequency_days: number | null
          last_interaction_date: string | null
          last_interaction_days: number | null
          mutual_value_score: number | null
          opportunities_generated: number | null
          reciprocity_score: number | null
          recommendations: string[] | null
          response_rate: number | null
          updated_at: string | null
          user_id: string
          value_exchange_score: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          engagement_level?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          interaction_count?: number | null
          interaction_frequency_days?: number | null
          last_interaction_date?: string | null
          last_interaction_days?: number | null
          mutual_value_score?: number | null
          opportunities_generated?: number | null
          reciprocity_score?: number | null
          recommendations?: string[] | null
          response_rate?: number | null
          updated_at?: string | null
          user_id: string
          value_exchange_score?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          engagement_level?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          interaction_count?: number | null
          interaction_frequency_days?: number | null
          last_interaction_date?: string | null
          last_interaction_days?: number | null
          mutual_value_score?: number | null
          opportunities_generated?: number | null
          reciprocity_score?: number | null
          recommendations?: string[] | null
          response_rate?: number | null
          updated_at?: string | null
          user_id?: string
          value_exchange_score?: number | null
        }
        Relationships: []
      }
      relationship_impact_metrics: {
        Row: {
          contact_id: string | null
          created_at: string | null
          id: string
          meetings_scheduled: number | null
          metric_date: string | null
          opportunities_generated: number | null
          outreach_sent: number | null
          referrals_received: number | null
          responses_received: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          meetings_scheduled?: number | null
          metric_date?: string | null
          opportunities_generated?: number | null
          outreach_sent?: number | null
          referrals_received?: number | null
          responses_received?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          meetings_scheduled?: number | null
          metric_date?: string | null
          opportunities_generated?: number | null
          outreach_sent?: number | null
          referrals_received?: number | null
          responses_received?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_impact_metrics_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_maintenance_reminders: {
        Row: {
          ai_generated_message: string | null
          completed_at: string | null
          contact_id: string | null
          context_data: Json | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          priority: string | null
          reminder_date: string
          reminder_type: string
          suggested_action: string | null
          suggested_template_id: string | null
          template_content: string | null
          template_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_message?: string | null
          completed_at?: string | null
          contact_id?: string | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          reminder_date: string
          reminder_type: string
          suggested_action?: string | null
          suggested_template_id?: string | null
          template_content?: string | null
          template_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_message?: string | null
          completed_at?: string | null
          contact_id?: string | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          reminder_date?: string
          reminder_type?: string
          suggested_action?: string | null
          suggested_template_id?: string | null
          template_content?: string | null
          template_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_maintenance_reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_maintenance_reminders_suggested_template_id_fkey"
            columns: ["suggested_template_id"]
            isOneToOne: false
            referencedRelation: "relationship_maintenance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_maintenance_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_system_template: boolean | null
          subject: string | null
          template_name: string
          template_type: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_system_template?: boolean | null
          subject?: string | null
          template_name: string
          template_type: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_system_template?: boolean | null
          subject?: string | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      relationship_message_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          message_body: string
          subject_line: string | null
          template_name: string
          template_type: string
          tone: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message_body: string
          subject_line?: string | null
          template_name: string
          template_type: string
          tone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message_body?: string
          subject_line?: string | null
          template_name?: string
          template_type?: string
          tone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      relationship_strengthening_suggestions: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          relevance_score: number | null
          status: string | null
          suggestion_description: string
          suggestion_title: string
          suggestion_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          status?: string | null
          suggestion_description: string
          suggestion_title: string
          suggestion_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          status?: string | null
          suggestion_description?: string
          suggestion_title?: string
          suggestion_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_strengthening_suggestions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "professional_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_templates: {
        Row: {
          created_at: string | null
          id: string
          is_system_template: boolean | null
          message_template: string
          subject_line: string | null
          template_name: string
          template_type: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system_template?: boolean | null
          message_template: string
          subject_line?: string | null
          template_name: string
          template_type: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system_template?: boolean | null
          message_template?: string
          subject_line?: string | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      response_coaching_feedback: {
        Row: {
          alternative_approaches: Json | null
          created_at: string
          feedback: Json
          id: string
          improvement_suggestions: Json | null
          mock_session_id: string | null
          practice_number: number
          question_response_id: string | null
          response_text: string
          scores: Json
          star_adherence: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alternative_approaches?: Json | null
          created_at?: string
          feedback: Json
          id?: string
          improvement_suggestions?: Json | null
          mock_session_id?: string | null
          practice_number?: number
          question_response_id?: string | null
          response_text: string
          scores: Json
          star_adherence?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alternative_approaches?: Json | null
          created_at?: string
          feedback?: Json
          id?: string
          improvement_suggestions?: Json | null
          mock_session_id?: string | null
          practice_number?: number
          question_response_id?: string | null
          response_text?: string
          scores?: Json
          star_adherence?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_coaching_feedback_mock_session_id_fkey"
            columns: ["mock_session_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_coaching_feedback_question_response_id_fkey"
            columns: ["question_response_id"]
            isOneToOne: false
            referencedRelation: "interview_question_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      response_practice_sessions: {
        Row: {
          ai_feedback: string | null
          created_at: string
          id: string
          practice_response: string
          question: string
          question_type: string
          response_id: string | null
          scores: Json | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string
          id?: string
          practice_response: string
          question: string
          question_type: string
          response_id?: string | null
          scores?: Json | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string
          id?: string
          practice_response?: string
          question?: string
          question_type?: string
          response_id?: string | null
          scores?: Json | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_practice_sessions_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "interview_response_library"
            referencedColumns: ["id"]
          },
        ]
      }
      response_time_predictions: {
        Row: {
          actual_response_days: number | null
          confidence_level: number | null
          created_at: string
          factors_used: Json | null
          id: string
          is_overdue: boolean | null
          job_id: string
          predicted_avg_days: number
          predicted_max_days: number
          predicted_min_days: number
          prediction_accuracy: number | null
          responded_at: string | null
          suggested_follow_up_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_response_days?: number | null
          confidence_level?: number | null
          created_at?: string
          factors_used?: Json | null
          id?: string
          is_overdue?: boolean | null
          job_id: string
          predicted_avg_days: number
          predicted_max_days: number
          predicted_min_days: number
          prediction_accuracy?: number | null
          responded_at?: string | null
          suggested_follow_up_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_response_days?: number | null
          confidence_level?: number | null
          created_at?: string
          factors_used?: Json | null
          id?: string
          is_overdue?: boolean | null
          job_id?: string
          predicted_avg_days?: number
          predicted_max_days?: number
          predicted_min_days?: number
          prediction_accuracy?: number | null
          responded_at?: string | null
          suggested_follow_up_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_time_predictions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_feedback: {
        Row: {
          comment_text: string
          created_at: string
          feedback_theme: string | null
          id: string
          implemented_at: string | null
          implemented_in_version: string | null
          item_reference: string | null
          resolved_at: string | null
          resolved_by: string | null
          resume_id: string
          reviewer_email: string
          reviewer_name: string
          section_reference: string | null
          share_id: string
          status: string
          updated_at: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          feedback_theme?: string | null
          id?: string
          implemented_at?: string | null
          implemented_in_version?: string | null
          item_reference?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resume_id: string
          reviewer_email: string
          reviewer_name: string
          section_reference?: string | null
          share_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          feedback_theme?: string | null
          id?: string
          implemented_at?: string | null
          implemented_in_version?: string | null
          item_reference?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resume_id?: string
          reviewer_email?: string
          reviewer_name?: string
          section_reference?: string | null
          share_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_feedback_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_feedback_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "resume_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_section_presets: {
        Row: {
          created_at: string
          id: string
          preset_name: string
          sections: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preset_name: string
          sections?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preset_name?: string
          sections?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_share_permissions: {
        Row: {
          created_at: string
          id: string
          permission_level: string
          reviewer_email: string
          share_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_level?: string
          reviewer_email: string
          share_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_level?: string
          reviewer_email?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_share_permissions_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "resume_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_shares: {
        Row: {
          allow_comments: boolean
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          privacy_level: string
          resume_id: string
          review_deadline: string | null
          share_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_comments?: boolean
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          privacy_level?: string
          resume_id: string
          review_deadline?: string | null
          share_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_comments?: boolean
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          privacy_level?: string
          resume_id?: string
          review_deadline?: string | null
          share_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_shares_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_templates: {
        Row: {
          created_at: string
          customization_settings: Json | null
          id: string
          is_default: boolean | null
          is_system_template: boolean | null
          team_id: string | null
          template_name: string
          template_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customization_settings?: Json | null
          id?: string
          is_default?: boolean | null
          is_system_template?: boolean | null
          team_id?: string | null
          template_name: string
          template_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customization_settings?: Json | null
          id?: string
          is_default?: boolean | null
          is_system_template?: boolean | null
          team_id?: string | null
          template_name?: string
          template_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          content: Json | null
          created_at: string
          customization_overrides: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          parent_resume_id: string | null
          resume_name: string
          template_id: string | null
          updated_at: string
          user_id: string
          version_description: string | null
          version_number: number | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          customization_overrides?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          parent_resume_id?: string | null
          resume_name: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          version_description?: string | null
          version_number?: number | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          customization_overrides?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          parent_resume_id?: string | null
          resume_name?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          version_description?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resumes_parent_resume_id_fkey"
            columns: ["parent_resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "resume_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_analytics_snapshots: {
        Row: {
          ai_recommendations: Json | null
          career_growth_rate: number | null
          created_at: string
          current_total_compensation: number | null
          id: string
          industry: string | null
          job_title: string | null
          location: string | null
          market_median: number | null
          market_percentile_25: number | null
          market_percentile_75: number | null
          market_position: string | null
          negotiation_success_rate: number | null
          percentile_rank: number | null
          snapshot_date: string
          successful_negotiations: number | null
          total_negotiations: number | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          ai_recommendations?: Json | null
          career_growth_rate?: number | null
          created_at?: string
          current_total_compensation?: number | null
          id?: string
          industry?: string | null
          job_title?: string | null
          location?: string | null
          market_median?: number | null
          market_percentile_25?: number | null
          market_percentile_75?: number | null
          market_position?: string | null
          negotiation_success_rate?: number | null
          percentile_rank?: number | null
          snapshot_date?: string
          successful_negotiations?: number | null
          total_negotiations?: number | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          ai_recommendations?: Json | null
          career_growth_rate?: number | null
          created_at?: string
          current_total_compensation?: number | null
          id?: string
          industry?: string | null
          job_title?: string | null
          location?: string | null
          market_median?: number | null
          market_percentile_25?: number | null
          market_percentile_75?: number | null
          market_position?: string | null
          negotiation_success_rate?: number | null
          percentile_rank?: number | null
          snapshot_date?: string
          successful_negotiations?: number | null
          total_negotiations?: number | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      salary_progression: {
        Row: {
          base_salary: number
          benefits_value: number | null
          bonus: number | null
          company_name: string | null
          created_at: string
          end_date: string | null
          equity_value: number | null
          final_offer: number | null
          id: string
          industry: string | null
          is_current: boolean | null
          job_title: string
          location: string | null
          negotiation_attempted: boolean | null
          negotiation_successful: boolean | null
          notes: string | null
          original_offer: number | null
          salary_type: string | null
          start_date: string
          total_compensation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_salary: number
          benefits_value?: number | null
          bonus?: number | null
          company_name?: string | null
          created_at?: string
          end_date?: string | null
          equity_value?: number | null
          final_offer?: number | null
          id?: string
          industry?: string | null
          is_current?: boolean | null
          job_title: string
          location?: string | null
          negotiation_attempted?: boolean | null
          negotiation_successful?: boolean | null
          notes?: string | null
          original_offer?: number | null
          salary_type?: string | null
          start_date: string
          total_compensation: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_salary?: number
          benefits_value?: number | null
          bonus?: number | null
          company_name?: string | null
          created_at?: string
          end_date?: string | null
          equity_value?: number | null
          final_offer?: number | null
          id?: string
          industry?: string | null
          is_current?: boolean | null
          job_title?: string
          location?: string | null
          negotiation_attempted?: boolean | null
          negotiation_successful?: boolean | null
          notes?: string | null
          original_offer?: number | null
          salary_type?: string | null
          start_date?: string
          total_compensation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_research: {
        Row: {
          base_salary_avg: number | null
          benefits_value: number | null
          bonus_avg: number | null
          company_size: string | null
          compensation_gap: number | null
          competitive_analysis: string | null
          created_at: string
          current_compensation: number | null
          equity_avg: number | null
          experience_level: string | null
          final_salary: number | null
          historical_trends: Json | null
          id: string
          job_id: string
          job_title: string
          location: string | null
          market_comparisons: Json | null
          market_position: string | null
          median_salary: number | null
          negotiated_at: string | null
          negotiation_outcome: string | null
          negotiation_recommendations: Json | null
          negotiation_success: boolean | null
          original_offer: number | null
          percentile_25: number | null
          percentile_75: number | null
          salary_increase_amount: number | null
          salary_increase_percentage: number | null
          salary_range_max: number | null
          salary_range_min: number | null
          similar_positions: Json | null
          total_compensation_avg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_salary_avg?: number | null
          benefits_value?: number | null
          bonus_avg?: number | null
          company_size?: string | null
          compensation_gap?: number | null
          competitive_analysis?: string | null
          created_at?: string
          current_compensation?: number | null
          equity_avg?: number | null
          experience_level?: string | null
          final_salary?: number | null
          historical_trends?: Json | null
          id?: string
          job_id: string
          job_title: string
          location?: string | null
          market_comparisons?: Json | null
          market_position?: string | null
          median_salary?: number | null
          negotiated_at?: string | null
          negotiation_outcome?: string | null
          negotiation_recommendations?: Json | null
          negotiation_success?: boolean | null
          original_offer?: number | null
          percentile_25?: number | null
          percentile_75?: number | null
          salary_increase_amount?: number | null
          salary_increase_percentage?: number | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          similar_positions?: Json | null
          total_compensation_avg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_salary_avg?: number | null
          benefits_value?: number | null
          bonus_avg?: number | null
          company_size?: string | null
          compensation_gap?: number | null
          competitive_analysis?: string | null
          created_at?: string
          current_compensation?: number | null
          equity_avg?: number | null
          experience_level?: string | null
          final_salary?: number | null
          historical_trends?: Json | null
          id?: string
          job_id?: string
          job_title?: string
          location?: string | null
          market_comparisons?: Json | null
          market_position?: string | null
          median_salary?: number | null
          negotiated_at?: string | null
          negotiation_outcome?: string | null
          negotiation_recommendations?: Json | null
          negotiation_success?: boolean | null
          original_offer?: number | null
          percentile_25?: number | null
          percentile_75?: number | null
          salary_increase_amount?: number | null
          salary_increase_percentage?: number | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          similar_positions?: Json | null
          total_compensation_avg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_research_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_market_searches: {
        Row: {
          created_at: string
          id: string
          industry: string
          is_favorite: boolean | null
          location: string | null
          search_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry: string
          is_favorite?: boolean | null
          location?: string | null
          search_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string
          is_favorite?: boolean | null
          location?: string | null
          search_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_search_preferences: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_applications: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          job_id: string | null
          recommendation_reason: string | null
          scheduled_for: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          recommendation_reason?: string | null
          scheduled_for: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          recommendation_reason?: string | null
          scheduled_for?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_demand_trends: {
        Row: {
          analysis_date: string
          average_salary: number | null
          created_at: string | null
          demand_score: number
          favorited_at: string | null
          growth_rate: number | null
          id: string
          industry: string
          is_favorited: boolean | null
          job_posting_count: number | null
          market_saturation: number | null
          related_skills: Json | null
          skill_name: string
          trend_direction: string | null
          user_id: string
        }
        Insert: {
          analysis_date?: string
          average_salary?: number | null
          created_at?: string | null
          demand_score: number
          favorited_at?: string | null
          growth_rate?: number | null
          id?: string
          industry: string
          is_favorited?: boolean | null
          job_posting_count?: number | null
          market_saturation?: number | null
          related_skills?: Json | null
          skill_name: string
          trend_direction?: string | null
          user_id: string
        }
        Update: {
          analysis_date?: string
          average_salary?: number | null
          created_at?: string | null
          demand_score?: number
          favorited_at?: string | null
          growth_rate?: number | null
          id?: string
          industry?: string
          is_favorited?: boolean | null
          job_posting_count?: number | null
          market_saturation?: number | null
          related_skills?: Json | null
          skill_name?: string
          trend_direction?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skill_development_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_level: string
          id: string
          job_id: string | null
          learning_resources: Json | null
          notes: string | null
          priority: string
          progress_percentage: number | null
          skill_name: string
          started_at: string | null
          status: string
          target_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_level?: string
          id?: string
          job_id?: string | null
          learning_resources?: Json | null
          notes?: string | null
          priority?: string
          progress_percentage?: number | null
          skill_name: string
          started_at?: string | null
          status?: string
          target_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_level?: string
          id?: string
          job_id?: string | null
          learning_resources?: Json | null
          notes?: string | null
          priority?: string
          progress_percentage?: number | null
          skill_name?: string
          started_at?: string | null
          status?: string
          target_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_development_progress_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_gap_analyses: {
        Row: {
          created_at: string
          estimated_learning_time_weeks: number | null
          id: string
          job_id: string
          learning_path: Json | null
          matching_skills: Json | null
          missing_skills: Json | null
          priority_skills: Json | null
          updated_at: string
          user_id: string
          weak_skills: Json | null
        }
        Insert: {
          created_at?: string
          estimated_learning_time_weeks?: number | null
          id?: string
          job_id: string
          learning_path?: Json | null
          matching_skills?: Json | null
          missing_skills?: Json | null
          priority_skills?: Json | null
          updated_at?: string
          user_id: string
          weak_skills?: Json | null
        }
        Update: {
          created_at?: string
          estimated_learning_time_weeks?: number | null
          id?: string
          job_id?: string
          learning_path?: Json | null
          matching_skills?: Json | null
          missing_skills?: Json | null
          priority_skills?: Json | null
          updated_at?: string
          user_id?: string
          weak_skills?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_gap_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          id: string
          proficiency_level: string
          skill_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          proficiency_level: string
          skill_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          proficiency_level?: string
          skill_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      smart_follow_up_reminders: {
        Row: {
          application_stage: string
          company_responsiveness: string | null
          created_at: string
          email_subject: string | null
          email_template: string | null
          etiquette_tips: string[] | null
          follow_up_count: number | null
          id: string
          is_completed: boolean | null
          is_dismissed: boolean | null
          is_snoozed: boolean | null
          job_id: string
          max_follow_ups: number | null
          reminder_date: string
          reminder_type: string
          response_date: string | null
          response_received: boolean | null
          snooze_until: string | null
          suggested_timing: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_stage: string
          company_responsiveness?: string | null
          created_at?: string
          email_subject?: string | null
          email_template?: string | null
          etiquette_tips?: string[] | null
          follow_up_count?: number | null
          id?: string
          is_completed?: boolean | null
          is_dismissed?: boolean | null
          is_snoozed?: boolean | null
          job_id: string
          max_follow_ups?: number | null
          reminder_date: string
          reminder_type?: string
          response_date?: string | null
          response_received?: boolean | null
          snooze_until?: string | null
          suggested_timing?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_stage?: string
          company_responsiveness?: string | null
          created_at?: string
          email_subject?: string | null
          email_template?: string | null
          etiquette_tips?: string[] | null
          follow_up_count?: number | null
          id?: string
          is_completed?: boolean | null
          is_dismissed?: boolean | null
          is_snoozed?: boolean | null
          job_id?: string
          max_follow_ups?: number | null
          reminder_date?: string
          reminder_type?: string
          response_date?: string | null
          response_received?: boolean | null
          snooze_until?: string | null
          suggested_timing?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_follow_up_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_boundaries: {
        Row: {
          allow_unsolicited_advice: boolean | null
          communication_preferences: Json | null
          created_at: string
          id: string
          preferred_contact_frequency: string | null
          preferred_support_types: string[] | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          topics_off_limits: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_unsolicited_advice?: boolean | null
          communication_preferences?: Json | null
          created_at?: string
          id?: string
          preferred_contact_frequency?: string | null
          preferred_support_types?: string[] | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          topics_off_limits?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_unsolicited_advice?: boolean | null
          communication_preferences?: Json | null
          created_at?: string
          id?: string
          preferred_contact_frequency?: string | null
          preferred_support_types?: string[] | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          topics_off_limits?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tailored_experience_versions: {
        Row: {
          action_verbs: Json | null
          created_at: string
          employment_id: string
          id: string
          industry_terms: Json | null
          is_active: boolean | null
          job_description_excerpt: string | null
          job_id: string | null
          key_responsibilities: Json | null
          quantified_accomplishments: Json | null
          relevance_score: number
          tailored_description: string
          updated_at: string
          user_id: string
          variation_label: string
        }
        Insert: {
          action_verbs?: Json | null
          created_at?: string
          employment_id: string
          id?: string
          industry_terms?: Json | null
          is_active?: boolean | null
          job_description_excerpt?: string | null
          job_id?: string | null
          key_responsibilities?: Json | null
          quantified_accomplishments?: Json | null
          relevance_score: number
          tailored_description: string
          updated_at?: string
          user_id: string
          variation_label: string
        }
        Update: {
          action_verbs?: Json | null
          created_at?: string
          employment_id?: string
          id?: string
          industry_terms?: Json | null
          is_active?: boolean | null
          job_description_excerpt?: string | null
          job_id?: string | null
          key_responsibilities?: Json | null
          quantified_accomplishments?: Json | null
          relevance_score?: number
          tailored_description?: string
          updated_at?: string
          user_id?: string
          variation_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailored_experience_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_communication: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_communication_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_job_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          shared_job_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          shared_job_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          shared_job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_job_comments_shared_job_id_fkey"
            columns: ["shared_job_id"]
            isOneToOne: false
            referencedRelation: "team_shared_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_link_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          shared_link_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          shared_link_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          shared_link_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_link_comments_shared_link_id_fkey"
            columns: ["shared_link_id"]
            isOneToOne: false
            referencedRelation: "team_shared_links"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_shared_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          notes: string | null
          shared_by: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          shared_by: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          shared_by?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_shared_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_shared_jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_shared_links: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          job_title: string
          job_url: string
          notes: string | null
          shared_by: string
          team_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          job_title: string
          job_url: string
          notes?: string | null
          shared_by: string
          team_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          job_title?: string
          job_url?: string
          notes?: string | null
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_shared_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      technical_challenge_attempts: {
        Row: {
          ai_feedback: Json | null
          challenge_id: string
          code_solution: string | null
          completed_at: string | null
          created_at: string
          id: string
          performance_metrics: Json | null
          score: number | null
          solution_text: string | null
          time_taken_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          challenge_id: string
          code_solution?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          performance_metrics?: Json | null
          score?: number | null
          solution_text?: string | null
          time_taken_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          challenge_id?: string
          code_solution?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          performance_metrics?: Json | null
          score?: number | null
          solution_text?: string | null
          time_taken_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_challenges: {
        Row: {
          category: string
          challenge_data: Json
          created_at: string
          description: string | null
          difficulty: string
          id: string
          status: string
          time_spent: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          challenge_data?: Json
          created_at?: string
          description?: string | null
          difficulty: string
          id?: string
          status?: string
          time_spent?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          challenge_data?: Json
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          status?: string
          time_spent?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_prep_attempts: {
        Row: {
          ai_feedback: Json | null
          challenge_type: string
          completed_at: string
          created_at: string
          difficulty_level: string
          id: string
          job_id: string | null
          question_data: Json
          question_title: string
          score: number | null
          time_spent_seconds: number | null
          user_id: string
          user_solution: string
        }
        Insert: {
          ai_feedback?: Json | null
          challenge_type: string
          completed_at?: string
          created_at?: string
          difficulty_level: string
          id?: string
          job_id?: string | null
          question_data: Json
          question_title: string
          score?: number | null
          time_spent_seconds?: number | null
          user_id: string
          user_solution: string
        }
        Update: {
          ai_feedback?: Json | null
          challenge_type?: string
          completed_at?: string
          created_at?: string
          difficulty_level?: string
          id?: string
          job_id?: string | null
          question_data?: Json
          question_title?: string
          score?: number | null
          time_spent_seconds?: number | null
          user_id?: string
          user_solution?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_prep_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking_entries: {
        Row: {
          activity_title: string
          activity_type: string
          created_at: string | null
          duration_minutes: number
          ended_at: string
          energy_level: number | null
          id: string
          notes: string | null
          productivity_rating: number | null
          related_contact_id: string | null
          related_job_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          activity_title: string
          activity_type: string
          created_at?: string | null
          duration_minutes: number
          ended_at: string
          energy_level?: number | null
          id?: string
          notes?: string | null
          productivity_rating?: number | null
          related_contact_id?: string | null
          related_job_id?: string | null
          started_at: string
          user_id: string
        }
        Update: {
          activity_title?: string
          activity_type?: string
          created_at?: string | null
          duration_minutes?: number
          ended_at?: string
          energy_level?: number | null
          id?: string
          notes?: string | null
          productivity_rating?: number | null
          related_contact_id?: string | null
          related_job_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timing_ab_tests: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string
          statistical_significance: number | null
          test_name: string
          updated_at: string
          user_id: string
          variant_a_description: string
          variant_a_responses: number | null
          variant_a_submissions: number | null
          variant_b_description: string
          variant_b_responses: number | null
          variant_b_submissions: number | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          statistical_significance?: number | null
          test_name: string
          updated_at?: string
          user_id: string
          variant_a_description: string
          variant_a_responses?: number | null
          variant_a_submissions?: number | null
          variant_b_description: string
          variant_b_responses?: number | null
          variant_b_submissions?: number | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          statistical_significance?: number | null
          test_name?: string
          updated_at?: string
          user_id?: string
          variant_a_description?: string
          variant_a_responses?: number | null
          variant_a_submissions?: number | null
          variant_b_description?: string
          variant_b_responses?: number | null
          variant_b_submissions?: number | null
          winner?: string | null
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string
          current_value: number | null
          end_date: string
          goal_type: string
          id: string
          is_active: boolean | null
          start_date: string
          target_value: number
          time_period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          end_date: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          start_date: string
          target_value: number
          time_period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          end_date?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_value?: number
          time_period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_home_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_primary: boolean | null
          latitude: number | null
          longitude: number | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_matching_preferences: {
        Row: {
          created_at: string
          education_weight: number
          experience_weight: number
          id: string
          skills_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          education_weight?: number
          experience_weight?: number
          id?: string
          skills_weight?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          education_weight?: number
          experience_weight?: number
          id?: string
          skills_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          experience_level: string | null
          first_name: string
          headline: string | null
          id: string
          industry: string | null
          last_name: string
          linkedin_access_token: string | null
          linkedin_headline: string | null
          linkedin_name: string | null
          linkedin_picture_url: string | null
          linkedin_profile_id: string | null
          linkedin_profile_picture_url: string | null
          linkedin_profile_url: string | null
          location: string | null
          phone: string | null
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          experience_level?: string | null
          first_name: string
          headline?: string | null
          id?: string
          industry?: string | null
          last_name: string
          linkedin_access_token?: string | null
          linkedin_headline?: string | null
          linkedin_name?: string | null
          linkedin_picture_url?: string | null
          linkedin_profile_id?: string | null
          linkedin_profile_picture_url?: string | null
          linkedin_profile_url?: string | null
          location?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          experience_level?: string | null
          first_name?: string
          headline?: string | null
          id?: string
          industry?: string | null
          last_name?: string
          linkedin_access_token?: string | null
          linkedin_headline?: string | null
          linkedin_name?: string | null
          linkedin_picture_url?: string | null
          linkedin_profile_id?: string | null
          linkedin_profile_picture_url?: string | null
          linkedin_profile_url?: string | null
          location?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellbeing_tracking: {
        Row: {
          activities_completed: Json | null
          created_at: string
          emotional_support_received: boolean | null
          energy_level: number | null
          id: string
          mood_score: number | null
          motivation_level: number | null
          notes: string | null
          stress_level: number | null
          support_impact_rating: number | null
          tracking_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activities_completed?: Json | null
          created_at?: string
          emotional_support_received?: boolean | null
          energy_level?: number | null
          id?: string
          mood_score?: number | null
          motivation_level?: number | null
          notes?: string | null
          stress_level?: number | null
          support_impact_rating?: number | null
          tracking_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activities_completed?: Json | null
          created_at?: string
          emotional_support_received?: boolean | null
          energy_level?: number | null
          id?: string
          mood_score?: number | null
          motivation_level?: number | null
          notes?: string | null
          stress_level?: number | null
          support_impact_rating?: number | null
          tracking_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cover_letter_has_active_share: {
        Args: { _cover_letter_id: string }
        Returns: boolean
      }
      cover_letter_share_allows_comments: {
        Args: { _share_id: string }
        Returns: boolean
      }
      delete_user: { Args: never; Returns: undefined }
      get_user_organization_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_team_role: {
        Args: {
          _role: Database["public"]["Enums"]["team_member_role"]
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_mentor_with_permission: {
        Args: { _mentee_id: string; _mentor_id: string; _permission: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_super_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_admin_or_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      resume_has_active_share: {
        Args: { _resume_id: string }
        Returns: boolean
      }
    }
    Enums: {
      email_type:
        | "recruiter_outreach"
        | "interview_invitation"
        | "rejection"
        | "offer"
        | "status_update"
        | "follow_up"
        | "other"
      scan_frequency: "hourly" | "daily" | "manual"
      team_member_role:
        | "owner"
        | "admin"
        | "member"
        | "viewer"
        | "mentor"
        | "candidate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      email_type: [
        "recruiter_outreach",
        "interview_invitation",
        "rejection",
        "offer",
        "status_update",
        "follow_up",
        "other",
      ],
      scan_frequency: ["hourly", "daily", "manual"],
      team_member_role: [
        "owner",
        "admin",
        "member",
        "viewer",
        "mentor",
        "candidate",
      ],
    },
  },
} as const
