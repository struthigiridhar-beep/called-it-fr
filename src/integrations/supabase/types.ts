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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bets: {
        Row: {
          amount: number
          created_at: string
          id: string
          market_id: string
          side: Database["public"]["Enums"]["bet_side"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          market_id: string
          side: Database["public"]["Enums"]["bet_side"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          market_id?: string
          side?: Database["public"]["Enums"]["bet_side"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_flags: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_flags_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_votes: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          user_id: string
          vote: Database["public"]["Enums"]["verdict_outcome"]
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          user_id: string
          vote: Database["public"]["Enums"]["verdict_outcome"]
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["verdict_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "dispute_votes_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          flags: number
          id: string
          resolution_verdict:
            | Database["public"]["Enums"]["verdict_outcome"]
            | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          verdict_id: string
        }
        Insert: {
          created_at?: string
          flags?: number
          id?: string
          resolution_verdict?:
            | Database["public"]["Enums"]["verdict_outcome"]
            | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          verdict_id: string
        }
        Update: {
          created_at?: string
          flags?: number
          id?: string
          resolution_verdict?:
            | Database["public"]["Enums"]["verdict_outcome"]
            | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          verdict_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_verdict_id_fkey"
            columns: ["verdict_id"]
            isOneToOne: false
            referencedRelation: "verdicts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_type: string
          group_id: string | null
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          group_id?: string | null
          id?: string
          payload: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          group_id?: string | null
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          coins: number
          crew_role: string | null
          group_id: string
          joined_at: string
          judge_integrity: number
          streak: number
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          crew_role?: string | null
          group_id: string
          joined_at?: string
          judge_integrity?: number
          streak?: number
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          crew_role?: string | null
          group_id?: string
          joined_at?: string
          judge_integrity?: number
          streak?: number
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_public: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_public?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          group_id: string
          id: string
          uses: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      market_nominations: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          nominated_by: string
          question_seed: string | null
          trigger_type: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          nominated_by: string
          question_seed?: string | null
          trigger_type: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          nominated_by?: string
          question_seed?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_nominations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_nominations_nominated_by_fkey"
            columns: ["nominated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deadline: string
          group_id: string | null
          id: string
          is_pinned: boolean
          is_public: boolean
          min_bet: number
          no_pool: number
          question: string
          status: Database["public"]["Enums"]["market_status"]
          yes_pool: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          deadline: string
          group_id?: string | null
          id?: string
          is_pinned?: boolean
          is_public?: boolean
          min_bet?: number
          no_pool?: number
          question: string
          status?: Database["public"]["Enums"]["market_status"]
          yes_pool?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deadline?: string
          group_id?: string | null
          id?: string
          is_pinned?: boolean
          is_public?: boolean
          min_bet?: number
          no_pool?: number
          question?: string
          status?: Database["public"]["Enums"]["market_status"]
          yes_pool?: number
        }
        Relationships: [
          {
            foreignKeyName: "markets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roasts: {
        Row: {
          created_at: string
          from_user: string
          group_id: string
          id: string
          message: string
          to_user: string
          trigger_type: string
        }
        Insert: {
          created_at?: string
          from_user: string
          group_id: string
          id?: string
          message: string
          to_user: string
          trigger_type?: string
        }
        Update: {
          created_at?: string
          from_user?: string
          group_id?: string
          id?: string
          message?: string
          to_user?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "roasts_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roasts_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_color: string
          created_at: string
          first_bet_at: string | null
          id: string
          name: string
          status_text: string | null
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          first_bet_at?: string | null
          id: string
          name?: string
          status_text?: string | null
        }
        Update: {
          avatar_color?: string
          created_at?: string
          first_bet_at?: string | null
          id?: string
          name?: string
          status_text?: string | null
        }
        Relationships: []
      }
      verdicts: {
        Row: {
          committed_at: string
          id: string
          judge_id: string
          market_id: string
          status: string
          verdict: Database["public"]["Enums"]["verdict_outcome"]
        }
        Insert: {
          committed_at?: string
          id?: string
          judge_id: string
          market_id: string
          status?: string
          verdict: Database["public"]["Enums"]["verdict_outcome"]
        }
        Update: {
          committed_at?: string
          id?: string
          judge_id?: string
          market_id?: string
          status?: string
          verdict?: Database["public"]["Enums"]["verdict_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "verdicts_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verdicts_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: true
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cast_dispute_vote: {
        Args: {
          _dispute_id: string
          _user_id: string
          _vote: Database["public"]["Enums"]["verdict_outcome"]
        }
        Returns: Json
      }
      flag_verdict: {
        Args: { _user_id: string; _verdict_id: string }
        Returns: Json
      }
      generate_invite_link: {
        Args: { p_group_id: string; p_inviter_id: string }
        Returns: string
      }
      resolve_market: {
        Args: { _judge_id: string; _market_id: string }
        Returns: undefined
      }
      user_group_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      bet_side: "yes" | "no"
      dispute_status: "open" | "upheld" | "overturned"
      market_status: "open" | "closed" | "resolved" | "disputed"
      transaction_type: "bet" | "payout" | "bonus" | "penalty" | "refund"
      verdict_outcome: "yes" | "no"
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
      bet_side: ["yes", "no"],
      dispute_status: ["open", "upheld", "overturned"],
      market_status: ["open", "closed", "resolved", "disputed"],
      transaction_type: ["bet", "payout", "bonus", "penalty", "refund"],
      verdict_outcome: ["yes", "no"],
    },
  },
} as const
