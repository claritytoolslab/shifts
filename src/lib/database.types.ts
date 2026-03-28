export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          location: string | null
          is_active: boolean
          privacy_contact: string | null
          privacy_retention: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          location?: string | null
          is_active?: boolean
          privacy_contact?: string | null
          privacy_retention?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          location?: string | null
          is_active?: boolean
          privacy_contact?: string | null
          privacy_retention?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          event_id: string
          name: string
          description: string | null
          min_age: number | null
          requires_drivers_license: boolean
          requires_tieturva: boolean
          requires_hygiene_passport: boolean
          other_requirements: string | null
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          description?: string | null
          min_age?: number | null
          requires_drivers_license?: boolean
          requires_tieturva?: boolean
          requires_hygiene_passport?: boolean
          other_requirements?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          min_age?: number | null
          requires_drivers_license?: boolean
          requires_tieturva?: boolean
          requires_hygiene_passport?: boolean
          other_requirements?: string | null
          category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      shifts: {
        Row: {
          id: string
          task_id: string
          team_name: string | null
          start_time: string
          end_time: string
          max_participants: number
          location: string | null
          notes: string | null
          no_show_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          team_name?: string | null
          start_time: string
          end_time: string
          max_participants: number
          location?: string | null
          notes?: string | null
          no_show_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          team_name?: string | null
          start_time?: string
          end_time?: string
          max_participants?: number
          location?: string | null
          notes?: string | null
          no_show_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { name?: string }
        Relationships: []
      }
      teams: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { name?: string }
        Relationships: []
      }
      registrations: {
        Row: {
          id: string
          shift_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          ssn: string
          has_drivers_license: boolean
          has_tieturva: boolean
          has_hygiene_passport: boolean
          notes: string | null
          status: string
          gdpr_accepted: boolean
          is_under_13: boolean
          guardian_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shift_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          ssn: string
          has_drivers_license?: boolean
          has_tieturva?: boolean
          has_hygiene_passport?: boolean
          notes?: string | null
          status?: string
          gdpr_accepted?: boolean
          is_under_13?: boolean
          guardian_phone?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_shift_id_fkey"
            columns: ["shift_id"]
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      shift_availability: {
        Row: {
          shift_id: string
          task_id: string
          team_name: string | null
          start_time: string
          end_time: string
          max_participants: number
          location: string | null
          notes: string | null
          no_show_count: number
          confirmed_count: number
          available_spots: number
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Event = Database['public']['Tables']['events']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Shift = Database['public']['Tables']['shifts']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type ShiftAvailability = Database['public']['Views']['shift_availability']['Row']

export type Category = Database['public']['Tables']['categories']['Row']
export type Team = Database['public']['Tables']['teams']['Row']

export type EventInsert = Database['public']['Tables']['events']['Insert']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert']
export type RegistrationInsert = Database['public']['Tables']['registrations']['Insert']
