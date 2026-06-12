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
      ad_campaigns: {
        Row: {
          advertiser_id: number
          approved_at: string | null
          budget_usd: number
          button_text: string
          button_url: string
          category_id: string | null
          click_rate_usd: number
          clicks_count: number
          completed_at: string | null
          created_at: string
          id: string
          image_base64: string | null
          rejection_reason: string | null
          spent_usd: number
          status: string
          target_clicks: number
          target_views: number
          text: string
          updated_at: string
          view_rate_usd: number
          views_count: number
          watermark: boolean
        }
        Insert: {
          advertiser_id: number
          approved_at?: string | null
          budget_usd?: number
          button_text: string
          button_url: string
          category_id?: string | null
          click_rate_usd?: number
          clicks_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          image_base64?: string | null
          rejection_reason?: string | null
          spent_usd?: number
          status?: string
          target_clicks?: number
          target_views?: number
          text?: string
          updated_at?: string
          view_rate_usd?: number
          views_count?: number
          watermark?: boolean
        }
        Update: {
          advertiser_id?: number
          approved_at?: string | null
          budget_usd?: number
          button_text?: string
          button_url?: string
          category_id?: string | null
          click_rate_usd?: number
          clicks_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          image_base64?: string | null
          rejection_reason?: string | null
          spent_usd?: number
          status?: string
          target_clicks?: number
          target_views?: number
          text?: string
          updated_at?: string
          view_rate_usd?: number
          views_count?: number
          watermark?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          created_at: string
          id: string
          placement_id: string
          source: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          placement_id: string
          source?: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: string
          placement_id?: string
          source?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          campaign_id: string
          channel_id: string
          chat_id: string
          clicks: number
          deleted_at: string | null
          id: string
          link_map: Json | null
          message_id: number | null
          sent_at: string
          unique_clicks: number
          views: number
        }
        Insert: {
          campaign_id: string
          channel_id: string
          chat_id: string
          clicks?: number
          deleted_at?: string | null
          id?: string
          link_map?: Json | null
          message_id?: number | null
          sent_at?: string
          unique_clicks?: number
          views?: number
        }
        Update: {
          campaign_id?: string
          channel_id?: string
          chat_id?: string
          clicks?: number
          deleted_at?: string | null
          id?: string
          link_map?: Json | null
          message_id?: number | null
          sent_at?: string
          unique_clicks?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_placements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_placements_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "telegram_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value_num: number | null
          value_text: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value_num?: number | null
          value_text?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value_num?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      earnings_ledger: {
        Row: {
          amount_usd: number
          campaign_id: string | null
          channel_id: string | null
          created_at: string
          id: string
          type: string
          user_id: number
        }
        Insert: {
          amount_usd: number
          campaign_id?: string | null
          channel_id?: string | null
          created_at?: string
          id?: string
          type: string
          user_id: number
        }
        Update: {
          amount_usd?: number
          campaign_id?: string | null
          channel_id?: string | null
          created_at?: string
          id?: string
          type?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "earnings_ledger_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_ledger_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "telegram_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: number
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: number
        }
        Relationships: []
      }
      post_clicks: {
        Row: {
          created_at: string
          id: string
          sent_message_id: string
          source: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          sent_message_id: string
          source?: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: string
          sent_message_id?: string
          source?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_clicks_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "sent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          advertiser_balance_usd: number
          balance_usd: number
          created_at: string
          first_name: string | null
          last_name: string | null
          mode: string
          onboarded: boolean
          photo_url: string | null
          publisher_balance_usd: number
          referral_code: string | null
          referrer_id: number | null
          telegram_user_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          advertiser_balance_usd?: number
          balance_usd?: number
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          mode?: string
          onboarded?: boolean
          photo_url?: string | null
          publisher_balance_usd?: number
          referral_code?: string | null
          referrer_id?: number | null
          telegram_user_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          advertiser_balance_usd?: number
          balance_usd?: number
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          mode?: string
          onboarded?: boolean
          photo_url?: string | null
          publisher_balance_usd?: number
          referral_code?: string | null
          referrer_id?: number | null
          telegram_user_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: number
          referrer_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: number
          referrer_id: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: number
          referrer_id?: number
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          button_color: string | null
          button_text: string | null
          button_url: string | null
          cpc_usd: number
          cpm_usd: number
          created_at: string
          id: string
          image_base64: string | null
          text: string
          updated_at: string
          watermark: boolean
        }
        Insert: {
          button_color?: string | null
          button_text?: string | null
          button_url?: string | null
          cpc_usd?: number
          cpm_usd?: number
          created_at?: string
          id?: string
          image_base64?: string | null
          text?: string
          updated_at?: string
          watermark?: boolean
        }
        Update: {
          button_color?: string | null
          button_text?: string | null
          button_url?: string | null
          cpc_usd?: number
          cpm_usd?: number
          created_at?: string
          id?: string
          image_base64?: string | null
          text?: string
          updated_at?: string
          watermark?: boolean
        }
        Relationships: []
      }
      sent_messages: {
        Row: {
          button_url: string | null
          campaign_id: string | null
          channel_id: string | null
          chat_id: string
          clicks: number
          cpc_usd: number
          cpm_usd: number
          id: string
          link_map: Json | null
          message_id: number | null
          owner_id: number
          sent_at: string
          text: string | null
          unique_clicks: number
          views: number
          watermark: boolean
        }
        Insert: {
          button_url?: string | null
          campaign_id?: string | null
          channel_id?: string | null
          chat_id: string
          clicks?: number
          cpc_usd?: number
          cpm_usd?: number
          id?: string
          link_map?: Json | null
          message_id?: number | null
          owner_id: number
          sent_at?: string
          text?: string | null
          unique_clicks?: number
          views?: number
          watermark?: boolean
        }
        Update: {
          button_url?: string | null
          campaign_id?: string | null
          channel_id?: string | null
          chat_id?: string
          clicks?: number
          cpc_usd?: number
          cpm_usd?: number
          id?: string
          link_map?: Json | null
          message_id?: number | null
          owner_id?: number
          sent_at?: string
          text?: string | null
          unique_clicks?: number
          views?: number
          watermark?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sent_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "telegram_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_channels: {
        Row: {
          accumulated_usd: number
          category_id: string | null
          chat_id: string
          created_at: string
          id: string
          members_count: number
          owner_id: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          title: string
          username: string | null
        }
        Insert: {
          accumulated_usd?: number
          category_id?: string | null
          chat_id: string
          created_at?: string
          id?: string
          members_count?: number
          owner_id?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          title: string
          username?: string | null
        }
        Update: {
          accumulated_usd?: number
          category_id?: string | null
          chat_id?: string
          created_at?: string
          id?: string
          members_count?: number
          owner_id?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          title?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
