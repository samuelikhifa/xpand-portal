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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          present: boolean
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          present?: boolean
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          present?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_scores: {
        Row: {
          attendance_score: number
          exam_score: number
          interview_score: number
          participant_id: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          attendance_score?: number
          exam_score?: number
          interview_score?: number
          participant_id: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          attendance_score?: number
          exam_score?: number
          interview_score?: number
          participant_id?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_scores_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          session_date: string
          session_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_date: string
          session_name: string
        }
        Update: {
          created_at?: string
          id?: string
          session_date?: string
          session_name?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          id: string
          topic: string
          question: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: string
          created_at: string
        }
        Insert: {
          id?: string
          topic: string
          question: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: string
          created_at?: string
        }
        Update: {
          id?: string
          topic?: string
          question?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          correct_answer?: string
          created_at?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          id: string
          title: string
          start_time: string
          end_time: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          start_time: string
          end_time: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          start_time?: string
          end_time?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      exam_participants: {
        Row: {
          id: string
          exam_id: string
          full_name: string
          email: string
          started_at: string
          submitted_at: string | null
          score: number | null
          question_ids: string[]
        }
        Insert: {
          id?: string
          exam_id: string
          full_name: string
          email: string
          started_at?: string
          submitted_at?: string | null
          score?: number | null
          question_ids: string[]
        }
        Update: {
          id?: string
          exam_id?: string
          full_name?: string
          email?: string
          started_at?: string
          submitted_at?: string | null
          score?: number | null
          question_ids?: string[]
        }
        Relationships: []
      }
      exam_responses: {
        Row: {
          id: string
          participant_id: string
          question_id: string
          selected_answer: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          question_id: string
          selected_answer?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          question_id?: string
          selected_answer?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_all_scores: { Args: never; Returns: undefined }
      recompute_attendance_score: {
        Args: { _participant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "participant"
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
      app_role: ["admin", "participant"],
    },
  },
} as const
