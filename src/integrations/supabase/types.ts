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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clothing_items: {
        Row: {
          availability_status: string
          brand: string | null
          category: string
          color: string
          created_at: string
          id: string
          image_path: string | null
          is_sample: boolean
          laundry_status: string
          name: string
          notes: string | null
          occasions: string[]
          season: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: string
          brand?: string | null
          category: string
          color: string
          created_at?: string
          id?: string
          image_path?: string | null
          is_sample?: boolean
          laundry_status?: string
          name: string
          notes?: string | null
          occasions?: string[]
          season?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: string
          brand?: string | null
          category?: string
          color?: string
          created_at?: string
          id?: string
          image_path?: string | null
          is_sample?: boolean
          laundry_status?: string
          name?: string
          notes?: string | null
          occasions?: string[]
          season?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          api_key_hash: string
          created_at: string
          device_identifier: string
          device_name: string
          id: string
          last_seen_at: string | null
          user_id: string
        }
        Insert: {
          api_key_hash: string
          created_at?: string
          device_identifier: string
          device_name: string
          id?: string
          last_seen_at?: string | null
          user_id: string
        }
        Update: {
          api_key_hash?: string
          created_at?: string
          device_identifier?: string
          device_name?: string
          id?: string
          last_seen_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      outfit_recommendations: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          occasion: string
          recommendation_source: string
          selected_item_ids: string[]
          styling_tips: string | null
          user_id: string
          weather_summary: string | null
          worn_at: string | null
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          occasion: string
          recommendation_source: string
          selected_item_ids: string[]
          styling_tips?: string | null
          user_id: string
          weather_summary?: string | null
          worn_at?: string | null
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          occasion?: string
          recommendation_source?: string
          selected_item_ids?: string[]
          styling_tips?: string | null
          user_id?: string
          weather_summary?: string | null
          worn_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          humidity_threshold: number
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          preferences: Json
          temp_high_threshold: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          humidity_threshold?: number
          id: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          preferences?: Json
          temp_high_threshold?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          humidity_threshold?: number
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          preferences?: Json
          temp_high_threshold?: number
        }
        Relationships: []
      }
      rfid_tags: {
        Row: {
          clothing_item_id: string
          created_at: string
          id: string
          is_active: boolean
          uid: string
          user_id: string
        }
        Insert: {
          clothing_item_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          uid: string
          user_id: string
        }
        Update: {
          clothing_item_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          uid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfid_tags_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          clothing_item_id: string | null
          created_at: string
          device_id: string | null
          event_type: string
          id: string
          is_simulated: boolean
          request_id: string | null
          result: string
          uid: string
          user_id: string
        }
        Insert: {
          clothing_item_id?: string | null
          created_at?: string
          device_id?: string | null
          event_type?: string
          id?: string
          is_simulated?: boolean
          request_id?: string | null
          result: string
          uid: string
          user_id: string
        }
        Update: {
          clothing_item_id?: string | null
          created_at?: string
          device_id?: string | null
          event_type?: string
          id?: string
          is_simulated?: boolean
          request_id?: string | null
          result?: string
          uid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_readings: {
        Row: {
          created_at: string
          device_id: string | null
          humidity: number
          id: string
          is_simulated: boolean
          temperature: number
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          humidity: number
          id?: string
          is_simulated?: boolean
          temperature: number
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          humidity?: number
          id?: string
          is_simulated?: boolean
          temperature?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
