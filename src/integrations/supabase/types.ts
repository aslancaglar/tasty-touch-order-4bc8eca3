export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_options: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          multiple: boolean | null
          name: string
          required: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          multiple?: boolean | null
          name: string
          required?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          multiple?: boolean | null
          name?: string
          required?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_topping_categories: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          menu_item_id: string
          topping_category_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          menu_item_id: string
          topping_category_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          menu_item_id?: string
          topping_category_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_topping_categories_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_topping_categories_topping_category_id_fkey"
            columns: ["topping_category_id"]
            isOneToOne: false
            referencedRelation: "topping_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available_from: string | null
          available_until: string | null
          category_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image: string | null
          in_stock: boolean
          is_featured: boolean
          name: string
          price: number
          promotion_price: number | null
          tax_percentage: number | null
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          in_stock?: boolean
          is_featured?: boolean
          name: string
          price: number
          promotion_price?: number | null
          tax_percentage?: number | null
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          in_stock?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          promotion_price?: number | null
          tax_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      option_choices: {
        Row: {
          created_at: string
          id: string
          name: string
          option_id: string
          price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          option_id: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          option_id?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_choices_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "menu_item_options"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          choice_id: string
          created_at: string
          id: string
          option_id: string
          order_item_id: string
          updated_at: string
        }
        Insert: {
          choice_id: string
          created_at?: string
          id?: string
          option_id: string
          order_item_id: string
          updated_at?: string
        }
        Update: {
          choice_id?: string
          created_at?: string
          id?: string
          option_id?: string
          order_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "option_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "menu_item_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_toppings: {
        Row: {
          created_at: string
          id: string
          order_item_id: string
          topping_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id: string
          topping_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string
          topping_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_toppings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_toppings_topping_id_fkey"
            columns: ["topping_id"]
            isOneToOne: false
            referencedRelation: "toppings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          price: number
          quantity: number
          special_instructions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          price: number
          quantity: number
          special_instructions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          price?: number
          quantity?: number
          special_instructions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          restaurant_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          restaurant_id: string
          status: string
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          restaurant_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          payment_method: string | null
          pos_response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method?: string | null
          pos_response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method?: string | null
          pos_response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_settings: {
        Row: {
          created_at: string | null
          id: string
          printnode_api_key: string
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          printnode_api_key: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          printnode_api_key?: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printer_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_api_keys: {
        Row: {
          created_at: string
          encrypted_key_id: string
          id: string
          is_active: boolean
          key_name: string
          last_rotated: string | null
          restaurant_id: string
          rotation_interval_days: number | null
          service_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_key_id: string
          id?: string
          is_active?: boolean
          key_name: string
          last_rotated?: string | null
          restaurant_id: string
          rotation_interval_days?: number | null
          service_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_key_id?: string
          id?: string
          is_active?: boolean
          key_name?: string
          last_rotated?: string | null
          restaurant_id?: string
          rotation_interval_days?: number | null
          service_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_owners: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_owners_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_print_config: {
        Row: {
          api_key: string | null
          browser_printing_enabled: boolean | null
          configured_printers: Json | null
          created_at: string | null
          id: string
          require_table_selection: boolean | null
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          browser_printing_enabled?: boolean | null
          configured_printers?: Json | null
          created_at?: string | null
          id?: string
          require_table_selection?: boolean | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          browser_printing_enabled?: boolean | null
          configured_printers?: Json | null
          created_at?: string | null
          id?: string
          require_table_selection?: boolean | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_print_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_printers: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_seen: string | null
          name: string
          online_status: boolean | null
          printer_id: string
          printnode_printer_id: string | null
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          name: string
          online_status?: boolean | null
          printer_id?: string
          printnode_printer_id?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          name?: string
          online_status?: boolean | null
          printer_id?: string
          printnode_printer_id?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_printers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          restaurant_id: string
          table_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id: string
          table_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id?: string
          table_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          card_payment_enabled: boolean | null
          cash_payment_enabled: boolean | null
          created_at: string
          currency: string
          id: string
          image_url: string | null
          location: string | null
          logo_url: string | null
          name: string
          slug: string
          ui_language: string
          updated_at: string
        }
        Insert: {
          card_payment_enabled?: boolean | null
          cash_payment_enabled?: boolean | null
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          slug: string
          ui_language?: string
          updated_at?: string
        }
        Update: {
          card_payment_enabled?: boolean | null
          cash_payment_enabled?: boolean | null
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          ui_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      topping_categories: {
        Row: {
          allow_multiple_same_topping: boolean
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          max_selections: number | null
          min_selections: number | null
          name: string
          restaurant_id: string
          show_if_selection_id: string[] | null
          show_if_selection_type: string[] | null
          updated_at: string
        }
        Insert: {
          allow_multiple_same_topping?: boolean
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          max_selections?: number | null
          min_selections?: number | null
          name: string
          restaurant_id: string
          show_if_selection_id?: string[] | null
          show_if_selection_type?: string[] | null
          updated_at?: string
        }
        Update: {
          allow_multiple_same_topping?: boolean
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          restaurant_id?: string
          show_if_selection_id?: string[] | null
          show_if_selection_type?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topping_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      toppings: {
        Row: {
          category_id: string
          created_at: string
          display_order: number | null
          id: string
          in_stock: boolean
          name: string
          price: number
          tax_percentage: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          in_stock?: boolean
          name: string
          price?: number
          tax_percentage?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          in_stock?: boolean
          name?: string
          price?: number
          tax_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toppings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "topping_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      duplicate_restaurant: {
        Args: { source_restaurant_id: string }
        Returns: string
      }
      get_daily_order_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_encrypted_api_key: {
        Args: {
          p_restaurant_id: string
          p_service_name: string
          p_key_name?: string
        }
        Returns: string
      }
      get_keys_needing_rotation: {
        Args: Record<PropertyKey, never>
        Returns: {
          restaurant_id: string
          service_name: string
          key_name: string
          days_since_rotation: number
        }[]
      }
      get_monthly_order_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_owned_restaurants: {
        Args: Record<PropertyKey, never>
        Returns: {
          card_payment_enabled: boolean | null
          cash_payment_enabled: boolean | null
          created_at: string
          currency: string
          id: string
          image_url: string | null
          location: string | null
          logo_url: string | null
          name: string
          slug: string
          ui_language: string
          updated_at: string
        }[]
      }
      get_popular_items: {
        Args: { limit_count: number }
        Returns: Json
      }
      get_popular_restaurants: {
        Args: { limit_count: number }
        Returns: Json
      }
      get_restaurant_from_category: {
        Args: { category_uuid: string }
        Returns: string
      }
      get_restaurant_from_order: {
        Args: { order_uuid: string }
        Returns: string
      }
      get_restaurant_from_topping_category: {
        Args: { category_uuid: string }
        Returns: string
      }
      is_admin_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_menu_item_available_now: {
        Args: { item_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { restaurant_uuid: string }
        Returns: boolean
      }
      is_restaurant_owner_secure: {
        Args: { restaurant_uuid: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { event_type: string; event_data?: Json }
        Returns: undefined
      }
      rotate_api_key: {
        Args: {
          p_restaurant_id: string
          p_service_name: string
          p_key_name: string
          p_new_api_key: string
        }
        Returns: boolean
      }
      store_encrypted_api_key: {
        Args: {
          p_restaurant_id: string
          p_service_name: string
          p_key_name: string
          p_api_key: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
