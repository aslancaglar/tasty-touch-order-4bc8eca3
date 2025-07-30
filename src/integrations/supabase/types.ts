export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          restaurant_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          restaurant_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          restaurant_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      language_settings: {
        Row: {
          created_at: string
          flag_url: string | null
          id: string
          language: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flag_url?: string | null
          id?: string
          language: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flag_url?: string | null
          id?: string
          language?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          created_at: string
          flag_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag_url?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          description_de: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          description_it: string | null
          description_nl: string | null
          description_pt: string | null
          description_ru: string | null
          description_tr: string | null
          description_zh: string | null
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          name_ar: string | null
          name_de: string | null
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          name_nl: string | null
          name_pt: string | null
          name_ru: string | null
          name_tr: string | null
          name_zh: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_nl?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_zh?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_nl?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_zh?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
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
          description_ar: string | null
          description_de: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          description_it: string | null
          description_nl: string | null
          description_pt: string | null
          description_ru: string | null
          description_tr: string | null
          description_zh: string | null
          display_order: number | null
          id: string
          image: string | null
          in_stock: boolean
          is_featured: boolean
          name: string
          name_ar: string | null
          name_de: string | null
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          name_nl: string | null
          name_pt: string | null
          name_ru: string | null
          name_tr: string | null
          name_zh: string | null
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
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_nl?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_zh?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          in_stock?: boolean
          is_featured?: boolean
          name: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
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
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_nl?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_zh?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          in_stock?: boolean
          is_featured?: boolean
          name?: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
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
          order_type: string | null
          restaurant_id: string
          status: string
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          order_type?: string | null
          restaurant_id: string
          status: string
          table_number?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          order_type?: string | null
          restaurant_id?: string
          status?: string
          table_number?: string | null
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
      restaurant_languages: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          language_code: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          language_code: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          language_code?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_restaurant_languages_language"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_restaurant_languages_restaurant"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      security_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          restaurant_id: string | null
          severity: string
          source_ip: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string | null
          severity: string
          source_ip?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string | null
          severity?: string
          source_ip?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      topping_categories: {
        Row: {
          allow_multiple_same_topping: boolean
          created_at: string
          description: string | null
          description_ar: string | null
          description_de: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          description_it: string | null
          description_nl: string | null
          description_pt: string | null
          description_ru: string | null
          description_tr: string | null
          description_zh: string | null
          display_order: number | null
          icon: string | null
          id: string
          max_selections: number | null
          min_selections: number | null
          name: string
          name_ar: string | null
          name_de: string | null
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          name_nl: string | null
          name_pt: string | null
          name_ru: string | null
          name_tr: string | null
          name_zh: string | null
          restaurant_id: string
          show_if_selection_id: string[] | null
          show_if_selection_type: string[] | null
          updated_at: string
        }
        Insert: {
          allow_multiple_same_topping?: boolean
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_nl?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_zh?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          max_selections?: number | null
          min_selections?: number | null
          name: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
          restaurant_id: string
          show_if_selection_id?: string[] | null
          show_if_selection_type?: string[] | null
          updated_at?: string
        }
        Update: {
          allow_multiple_same_topping?: boolean
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_nl?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_zh?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
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
          name_ar: string | null
          name_de: string | null
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          name_nl: string | null
          name_pt: string | null
          name_ru: string | null
          name_tr: string | null
          name_zh: string | null
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
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
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
          name_ar?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_nl?: string | null
          name_pt?: string | null
          name_ru?: string | null
          name_tr?: string | null
          name_zh?: string | null
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
      get_current_user_admin_status: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_daily_order_count: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      get_user_restaurant_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      is_menu_item_available_now: {
        Args: { item_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { restaurant_uuid: string }
        Returns: boolean
      }
      is_restaurant_owner_of_order: {
        Args: { order_id: string }
        Returns: boolean
      }
      is_restaurant_owner_of_order_item_option: {
        Args: { order_item_option_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          _event_type: string
          _severity: string
          _title: string
          _description?: string
          _source_ip?: string
          _user_id?: string
          _restaurant_id?: string
          _metadata?: Json
        }
        Returns: string
      }
      translate_topping_names: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
