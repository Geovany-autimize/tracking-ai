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
      couriers: {
        Row: {
          country_code: string | null
          courier_code: string
          courier_name: string
          created_at: string
          is_deprecated: boolean
          is_post: boolean
          required_fields: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          country_code?: string | null
          courier_code: string
          courier_name: string
          created_at?: string
          is_deprecated?: boolean
          is_post?: boolean
          required_fields?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          country_code?: string | null
          courier_code?: string
          courier_name?: string
          created_at?: string
          is_deprecated?: boolean
          is_post?: boolean
          required_fields?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          status: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          status?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          status?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      monthly_usage: {
        Row: {
          customer_id: string
          id: string
          period_ym: string
          updated_at: string | null
          used_credits: number | null
        }
        Insert: {
          customer_id: string
          id?: string
          period_ym: string
          updated_at?: string | null
          used_credits?: number | null
        }
        Update: {
          customer_id?: string
          id?: string
          period_ym?: string
          updated_at?: string | null
          used_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          courier_name: string | null
          created_at: string
          customer_id: string
          id: string
          is_read: boolean
          location: string | null
          message: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          shipment_id: string
          status_milestone: string | null
          title: string
          tracking_code: string
          updated_at: string
        }
        Insert: {
          courier_name?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_read?: boolean
          location?: string | null
          message: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          shipment_id: string
          status_milestone?: string | null
          title: string
          tracking_code: string
          updated_at?: string
        }
        Update: {
          courier_name?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_read?: boolean
          location?: string | null
          message?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          shipment_id?: string
          status_milestone?: string | null
          title?: string
          tracking_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_accounts: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          provider: string
          provider_account_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          provider: string
          provider_account_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          provider?: string
          provider_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      password_credentials: {
        Row: {
          customer_id: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          customer_id: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          customer_id?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_credentials_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          features: Json | null
          id: string
          is_public: boolean | null
          monthly_credits: number | null
          name: string
          price_cents: number | null
        }
        Insert: {
          features?: Json | null
          id: string
          is_public?: boolean | null
          monthly_credits?: number | null
          name: string
          price_cents?: number | null
        }
        Update: {
          features?: Json | null
          id?: string
          is_public?: boolean | null
          monthly_credits?: number | null
          name?: string
          price_cents?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          customer_id: string
          expires_at: string
          ip: string | null
          token_jti: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          expires_at: string
          ip?: string | null
          token_jti: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          expires_at?: string
          ip?: string | null
          token_jti?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_customers: {
        Row: {
          created_at: string | null
          customer_id: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          auto_tracking: boolean
          created_at: string | null
          customer_id: string
          id: string
          last_update: string | null
          shipment_customer_id: string | null
          shipment_data: Json | null
          status: string | null
          tracker_id: string | null
          tracking_code: string
          tracking_events: Json | null
          updated_at: string | null
        }
        Insert: {
          auto_tracking?: boolean
          created_at?: string | null
          customer_id: string
          id?: string
          last_update?: string | null
          shipment_customer_id?: string | null
          shipment_data?: Json | null
          status?: string | null
          tracker_id?: string | null
          tracking_code: string
          tracking_events?: Json | null
          updated_at?: string | null
        }
        Update: {
          auto_tracking?: boolean
          created_at?: string | null
          customer_id?: string
          id?: string
          last_update?: string | null
          shipment_customer_id?: string | null
          shipment_data?: Json | null
          status?: string | null
          tracker_id?: string | null
          tracking_code?: string
          tracking_events?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_shipment_customer_id_fkey"
            columns: ["shipment_customer_id"]
            isOneToOne: false
            referencedRelation: "shipment_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          plan_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          plan_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          plan_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_customer_id_from_request: { Args: never; Returns: string }
    }
    Enums: {
      notification_type:
        | "status_update"
        | "delivery"
        | "exception"
        | "out_for_delivery"
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
      notification_type: [
        "status_update",
        "delivery",
        "exception",
        "out_for_delivery",
      ],
    },
  },
} as const
