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
      auto_recharge_settings: {
        Row: {
          created_at: string | null
          customer_id: string
          enabled: boolean
          id: string
          last_payment_method_details: Json | null
          min_credits_threshold: number
          recharge_amount: number
          stripe_payment_method_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          enabled?: boolean
          id?: string
          last_payment_method_details?: Json | null
          min_credits_threshold?: number
          recharge_amount?: number
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          enabled?: boolean
          id?: string
          last_payment_method_details?: Json | null
          min_credits_threshold?: number
          recharge_amount?: number
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_recharge_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bling_authorization: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          code: string | null
          created_at: string
          id: number
          refresh_token: string | null
          token_expires_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          code?: string | null
          created_at?: string
          id?: number
          refresh_token?: string | null
          token_expires_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          code?: string | null
          created_at?: string
          id?: number
          refresh_token?: string | null
          token_expires_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bling_integrations: {
        Row: {
          access_token: string
          bling_user_id: string | null
          created_at: string
          customer_id: string
          id: string
          last_sync_at: string | null
          refresh_token: string
          status: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          bling_user_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_sync_at?: string | null
          refresh_token: string
          status?: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          bling_user_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string
          status?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bling_order_details: {
        Row: {
          bling_order_id: string
          carrier_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          customer_id: string
          delivery_address: Json | null
          freight_value: number | null
          full_data: Json | null
          id: string
          items: Json | null
          nfe_issue_date: string | null
          nfe_key: string | null
          nfe_number: string | null
          order_date: string | null
          order_number: string
          status: string | null
          total_value: number | null
          tracking_code: string | null
          updated_at: string | null
        }
        Insert: {
          bling_order_id: string
          carrier_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_id: string
          delivery_address?: Json | null
          freight_value?: number | null
          full_data?: Json | null
          id?: string
          items?: Json | null
          nfe_issue_date?: string | null
          nfe_key?: string | null
          nfe_number?: string | null
          order_date?: string | null
          order_number: string
          status?: string | null
          total_value?: number | null
          tracking_code?: string | null
          updated_at?: string | null
        }
        Update: {
          bling_order_id?: string
          carrier_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_address?: Json | null
          freight_value?: number | null
          full_data?: Json | null
          id?: string
          items?: Json | null
          nfe_issue_date?: string | null
          nfe_key?: string | null
          nfe_number?: string | null
          order_date?: string | null
          order_number?: string
          status?: string | null
          total_value?: number | null
          tracking_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bling_order_details_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bling_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          integration_id: string
          orders_failed: number | null
          orders_imported: number | null
          orders_updated: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          integration_id: string
          orders_failed?: number | null
          orders_imported?: number | null
          orders_updated?: number | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          integration_id?: string
          orders_failed?: number | null
          orders_imported?: number | null
          orders_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bling_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "bling_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      credit_purchases: {
        Row: {
          created_at: string
          credits_amount: number
          customer_id: string
          expires_at: string
          id: string
          is_auto_recharge: boolean | null
          price_cents: number
          price_per_credit_cents: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_amount: number
          customer_id: string
          expires_at: string
          id?: string
          is_auto_recharge?: boolean | null
          price_cents: number
          price_per_credit_cents: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_amount?: number
          customer_id?: string
          expires_at?: string
          id?: string
          is_auto_recharge?: boolean | null
          price_cents?: number
          price_per_credit_cents?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_usage: {
        Row: {
          created_at: string
          credits_consumed: number
          customer_id: string
          id: string
          purchase_id: string | null
          shipment_id: string | null
          source_type: string
          subscription_period_end: string | null
          subscription_period_start: string | null
          tracking_code: string
        }
        Insert: {
          created_at?: string
          credits_consumed?: number
          customer_id: string
          id?: string
          purchase_id?: string | null
          shipment_id?: string | null
          source_type: string
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          tracking_code: string
        }
        Update: {
          created_at?: string
          credits_consumed?: number
          customer_id?: string
          id?: string
          purchase_id?: string | null
          shipment_id?: string | null
          source_type?: string
          subscription_period_end?: string | null
          subscription_period_start?: string | null
          tracking_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_usage_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_usage_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          created_at: string
          creation_method: string | null
          customer_id: string
          id: string
          is_active: boolean
          message_content: string
          name: string
          notification_type: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creation_method?: string | null
          customer_id: string
          id?: string
          is_active?: boolean
          message_content: string
          name: string
          notification_type?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creation_method?: string | null
          customer_id?: string
          id?: string
          is_active?: boolean
          message_content?: string
          name?: string
          notification_type?: string[]
          updated_at?: string
        }
        Relationships: []
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
      rate_limits: {
        Row: {
          attempt_count: number
          created_at: string
          identifier: string
          locked_until: string | null
          window_start: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          identifier: string
          locked_until?: string | null
          window_start?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          identifier?: string
          locked_until?: string | null
          window_start?: string
        }
        Relationships: []
      }
      recipients: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
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
          bling_order_id: string | null
          bling_volume_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          last_update: string | null
          shipment_customer_id: string | null
          shipment_data: Json | null
          status: string | null
          total_volumes: number | null
          tracker_id: string | null
          tracking_code: string
          tracking_events: Json | null
          updated_at: string | null
          volume_numero: number | null
        }
        Insert: {
          auto_tracking?: boolean
          bling_order_id?: string | null
          bling_volume_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          last_update?: string | null
          shipment_customer_id?: string | null
          shipment_data?: Json | null
          status?: string | null
          total_volumes?: number | null
          tracker_id?: string | null
          tracking_code: string
          tracking_events?: Json | null
          updated_at?: string | null
          volume_numero?: number | null
        }
        Update: {
          auto_tracking?: boolean
          bling_order_id?: string | null
          bling_volume_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          last_update?: string | null
          shipment_customer_id?: string | null
          shipment_data?: Json | null
          status?: string | null
          total_volumes?: number | null
          tracker_id?: string | null
          tracking_code?: string
          tracking_events?: Json | null
          updated_at?: string | null
          volume_numero?: number | null
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
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          plan_id: string
          status: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          plan_id: string
          status?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          plan_id?: string
          status?: string | null
          stripe_subscription_id?: string | null
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
      create_shipment_with_credit: {
        Args: {
          p_auto_tracking?: boolean
          p_customer_id: string
          p_purchase_id?: string
          p_shipment_customer_id?: string
          p_source_type: string
          p_subscription_period_end?: string
          p_subscription_period_start?: string
          p_tracking_code: string
        }
        Returns: Json
      }
      get_customer_id_from_request: { Args: never; Returns: string }
    }
    Enums: {
      notification_type:
        | "status_update"
        | "delivery"
        | "exception"
        | "out_for_delivery"
        | "info_received"
        | "in_transit"
        | "failed_attempt"
        | "delivered"
        | "available_for_pickup"
        | "expired"
        | "pending"
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
        "info_received",
        "in_transit",
        "failed_attempt",
        "delivered",
        "available_for_pickup",
        "expired",
        "pending",
      ],
    },
  },
} as const
