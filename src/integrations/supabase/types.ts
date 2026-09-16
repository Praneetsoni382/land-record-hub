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
      audit_logs: {
        Row: {
          action: string
          case_id: string | null
          created_at: string
          description: string | null
          document_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          case_id?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          case_id?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          acquisition_reference: string | null
          case_id: string
          created_at: string
          created_by: string
          description: string | null
          district: string | null
          id: string
          is_demo: boolean
          project_name: string
          status: string
          updated_at: string
          village: string | null
        }
        Insert: {
          acquisition_reference?: string | null
          case_id: string
          created_at?: string
          created_by: string
          description?: string | null
          district?: string | null
          id?: string
          is_demo?: boolean
          project_name: string
          status?: string
          updated_at?: string
          village?: string | null
        }
        Update: {
          acquisition_reference?: string | null
          case_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          district?: string | null
          id?: string
          is_demo?: boolean
          project_name?: string
          status?: string
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          created_at: string
          document_id: string
          document_type: string | null
          extracted_data: Json | null
          extraction_confidence: number | null
          id: string
          model_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          document_type?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          id?: string
          model_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          document_type?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          id?: string
          model_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          document_type: string | null
          file_name: string
          file_size: number | null
          id: string
          is_demo: boolean
          mime_type: string
          overall_confidence: number | null
          processed_at: string | null
          processing_stage: string | null
          processing_status: string
          serial_number: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          document_type?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          is_demo?: boolean
          mime_type: string
          overall_confidence?: number | null
          processed_at?: string | null
          processing_stage?: string | null
          processing_status?: string
          serial_number?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          document_type?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          is_demo?: boolean
          mime_type?: string
          overall_confidence?: number | null
          processed_at?: string | null
          processing_stage?: string | null
          processing_status?: string
          serial_number?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_fields: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string
          field_name: string | null
          field_value: string | null
          id: string
          source_reference: string | null
          validation_reason: string | null
          validation_status: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id: string
          field_name?: string | null
          field_value?: string | null
          id?: string
          source_reference?: string | null
          validation_reason?: string | null
          validation_status?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string
          field_name?: string | null
          field_value?: string | null
          id?: string
          source_reference?: string | null
          validation_reason?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_fields_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_land_records: {
        Row: {
          area: number | null
          area_unit: string | null
          created_at: string
          district: string | null
          id: string
          is_demo: boolean
          khasra_number: string | null
          land_record_id: string
          owner_name: string | null
          status: string | null
          survey_number: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          area?: number | null
          area_unit?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_demo?: boolean
          khasra_number?: string | null
          land_record_id: string
          owner_name?: string | null
          status?: string | null
          survey_number?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          area?: number | null
          area_unit?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_demo?: boolean
          khasra_number?: string | null
          land_record_id?: string
          owner_name?: string | null
          status?: string | null
          survey_number?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      ownership_history: {
        Row: {
          case_id: string
          created_at: string
          id: string
          land_record_id: string | null
          mutation_date: string | null
          mutation_number: string | null
          new_owner: string | null
          previous_owner: string | null
          source_document_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          land_record_id?: string | null
          mutation_date?: string | null
          mutation_number?: string | null
          new_owner?: string | null
          previous_owner?: string | null
          source_document_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          land_record_id?: string | null
          mutation_date?: string | null
          mutation_number?: string | null
          new_owner?: string | null
          previous_owner?: string | null
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_history_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_steps: {
        Row: {
          completed_at: string | null
          document_id: string
          id: string
          message: string | null
          metadata: Json | null
          started_at: string | null
          status: string
          step_name: string
        }
        Insert: {
          completed_at?: string | null
          document_id: string
          id?: string
          message?: string | null
          metadata?: Json | null
          started_at?: string | null
          status: string
          step_name: string
        }
        Update: {
          completed_at?: string | null
          document_id?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_steps_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      verification_field_results: {
        Row: {
          confidence: number | null
          created_at: string
          field_name: string | null
          id: string
          legacy_value: string | null
          match_status: string | null
          reason: string | null
          source_type: string | null
          submitted_value: string | null
          verification_run_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          field_name?: string | null
          id?: string
          legacy_value?: string | null
          match_status?: string | null
          reason?: string | null
          source_type?: string | null
          submitted_value?: string | null
          verification_run_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          field_name?: string | null
          id?: string
          legacy_value?: string | null
          match_status?: string | null
          reason?: string | null
          source_type?: string | null
          submitted_value?: string | null
          verification_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_field_results_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_runs: {
        Row: {
          case_id: string
          completed_at: string | null
          conflict_status: string | null
          cross_document_status: string | null
          field_validation_status: string | null
          id: string
          integrity_score: number | null
          legacy_comparison_status: string | null
          started_at: string | null
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          conflict_status?: string | null
          cross_document_status?: string | null
          field_validation_status?: string | null
          id?: string
          integrity_score?: number | null
          legacy_comparison_status?: string | null
          started_at?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          conflict_status?: string | null
          cross_document_status?: string | null
          field_validation_status?: string | null
          id?: string
          integrity_score?: number | null
          legacy_comparison_status?: string | null
          started_at?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_land_records: {
        Row: {
          area: number | null
          area_unit: string | null
          case_id: string
          created_at: string
          district: string | null
          id: string
          integrity_score: number | null
          is_demo: boolean
          khasra_number: string | null
          land_record_id: string
          mutation_number: string | null
          owner_name: string | null
          registration_date: string | null
          registration_number: string | null
          survey_number: string | null
          updated_at: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          village: string | null
        }
        Insert: {
          area?: number | null
          area_unit?: string | null
          case_id: string
          created_at?: string
          district?: string | null
          id?: string
          integrity_score?: number | null
          is_demo?: boolean
          khasra_number?: string | null
          land_record_id: string
          mutation_number?: string | null
          owner_name?: string | null
          registration_date?: string | null
          registration_number?: string | null
          survey_number?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          village?: string | null
        }
        Update: {
          area?: number | null
          area_unit?: string | null
          case_id?: string
          created_at?: string
          district?: string | null
          id?: string
          integrity_score?: number | null
          is_demo?: boolean
          khasra_number?: string | null
          land_record_id?: string
          mutation_number?: string | null
          owner_name?: string | null
          registration_date?: string | null
          registration_number?: string | null
          survey_number?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verified_land_records_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_land_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_case: { Args: { _case_id: string }; Returns: boolean }
      can_access_document: { Args: { _document_id: string }; Returns: boolean }
      can_access_verification_run: {
        Args: { _run_id: string }
        Returns: boolean
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_case_id?: string
          p_description?: string
          p_document_id?: string
          p_new_value?: Json
          p_old_value?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
