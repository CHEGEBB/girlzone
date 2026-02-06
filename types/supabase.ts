export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at?: string
          username?: string
          full_name?: string
          avatar_url?: string
          is_premium?: boolean
          is_admin?: boolean
        }
        Insert: {
          id: string
          updated_at?: string
          username?: string
          full_name?: string
          avatar_url?: string
          is_premium?: boolean
          is_admin?: boolean
        }
        Update: {
          id?: string
          updated_at?: string
          username?: string
          full_name?: string
          avatar_url?: string
          is_premium?: boolean
          is_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          id: number
          stripe_secret_key?: string
          stripe_webhook_secret?: string
          site_name?: string
          logo_text?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: number
          stripe_secret_key?: string
          stripe_webhook_secret?: string
          site_name?: string
          logo_text?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          stripe_secret_key?: string
          stripe_webhook_secret?: string
          site_name?: string
          logo_text?: string
          created_at?: string
          updated_at?: string
        }
      }
      site_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          stripe_session_id?: string
          amount?: number
          status?: string
          payment_method?: string
          created_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_session_id?: string
          amount?: number
          status?: string
          payment_method?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_session_id?: string
          amount?: number
          status?: string
          payment_method?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          id: string
          user_id: string
          affiliate_code: string
          status: string
          commission_rate: number
          total_earnings: number
          total_clicks: number
          total_conversions: number
          conversion_rate: number
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          affiliate_code: string
          status?: string
          commission_rate?: number
          total_earnings?: number
          total_clicks?: number
          total_conversions?: number
          conversion_rate?: number
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          affiliate_code?: string
          status?: string
          commission_rate?: number
          total_earnings?: number
          total_clicks?: number
          total_conversions?: number
          conversion_rate?: number
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          id: string
          affiliate_id: string
          link_type: string
          target_url: string
          custom_code: string | null
          click_count: number
          conversion_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          affiliate_id: string
          link_type: string
          target_url: string
          custom_code?: string | null
          click_count?: number
          conversion_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          affiliate_id?: string
          link_type?: string
          target_url?: string
          custom_code?: string | null
          click_count?: number
          conversion_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          id: string
          affiliate_id: string
          affiliate_link_id: string | null
          visitor_ip: string | null
          user_agent: string | null
          referrer: string | null
          clicked_at: string
          converted: boolean
          conversion_value: number | null
          conversion_date: string | null
        }
        Insert: {
          id?: string
          affiliate_id: string
          affiliate_link_id?: string | null
          visitor_ip?: string | null
          user_agent?: string | null
          referrer?: string | null
          clicked_at?: string
          converted?: boolean
          conversion_value?: number | null
          conversion_date?: string | null
        }
        Update: {
          id?: string
          affiliate_id?: string
          affiliate_link_id?: string | null
          visitor_ip?: string | null
          user_agent?: string | null
          referrer?: string | null
          clicked_at?: string
          converted?: boolean
          conversion_value?: number | null
          conversion_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          id: string
          affiliate_id: string
          transaction_id: string | null
          commission_amount: number
          commission_rate: number
          transaction_amount: number
          status: string
          paid_at: string | null
          created_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          affiliate_id: string
          transaction_id?: string | null
          commission_amount: number
          commission_rate: number
          transaction_amount: number
          status?: string
          paid_at?: string | null
          created_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          affiliate_id?: string
          transaction_id?: string | null
          commission_amount?: number
          commission_rate?: number
          transaction_amount?: number
          status?: string
          paid_at?: string | null
          created_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          id: string
          affiliate_id: string
          total_amount: number
          commission_ids: string[]
          payout_method: string
          payout_details: any | null
          status: string
          processed_at: string | null
          created_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          affiliate_id: string
          total_amount: number
          commission_ids: string[]
          payout_method: string
          payout_details?: any | null
          status?: string
          processed_at?: string | null
          created_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          affiliate_id?: string
          total_amount?: number
          commission_ids?: string[]
          payout_method?: string
          payout_details?: any | null
          status?: string
          processed_at?: string | null
          created_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          id: string
          value: any
          updated_at: string
        }
        Insert: {
          id: string
          value: any
          updated_at?: string
        }
        Update: {
          id?: string
          value?: any
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_affiliate_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      track_affiliate_click: {
        Args: {
          p_affiliate_code: string
          p_link_type?: string
          p_target_url?: string
          p_visitor_ip?: string
          p_user_agent?: string
          p_referrer?: string
        }
        Returns: string
      }
      record_affiliate_conversion: {
        Args: {
          p_click_id: string
          p_transaction_id: string
          p_conversion_value: number
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
