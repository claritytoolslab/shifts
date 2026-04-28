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
          confirmation_email_subject: string | null
          confirmation_email_body: string | null
          sender_name: string | null
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
          confirmation_email_subject?: string | null
          confirmation_email_body?: string | null
          sender_name?: string | null
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
          confirmation_email_subject?: string | null
          confirmation_email_body?: string | null
          sender_name?: string | null
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
          requires_pelinohjauskoulutus: boolean
          requires_ea1: boolean
          requires_ajokortti: boolean
          requires_jarjestyksenvalvontakortti: boolean
          requires_shirt_size: boolean
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
          requires_pelinohjauskoulutus?: boolean
          requires_ea1?: boolean
          requires_ajokortti?: boolean
          requires_jarjestyksenvalvontakortti?: boolean
          requires_shirt_size?: boolean
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
          requires_pelinohjauskoulutus?: boolean
          requires_ea1?: boolean
          requires_ajokortti?: boolean
          requires_jarjestyksenvalvontakortti?: boolean
          requires_shirt_size?: boolean
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
      locations: {
        Row: {
          id: string
          event_id: string
          name: string
          city: string
          street: string
          number: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          city: string
          street: string
          number: string
          created_at?: string
        }
        Update: {
          name?: string
          city?: string
          street?: string
          number?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_event_id_fkey"
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
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
      email_queue: {
        Row: {
          id: string
          registration_id: string
          to_email: string
          subject: string
          html_body: string
          status: string
          error_message: string | null
          attempts: number
          created_at: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          registration_id: string
          to_email: string
          subject: string
          html_body: string
          status?: string
          error_message?: string | null
          attempts?: number
          created_at?: string
          sent_at?: string | null
        }
        Update: {
          status?: string
          error_message?: string | null
          attempts?: number
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_registration_id_fkey"
            columns: ["registration_id"]
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          }
        ]
      }
      registrations: {
        Row: {
          id: string
          shift_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          has_pelinohjauskoulutus: boolean
          has_ea1: boolean
          has_ajokortti: boolean
          has_jarjestyksenvalvontakortti: boolean
          shirt_size: string | null
          notes: string | null
          status: string
          gdpr_accepted: boolean
          is_under_13: boolean
          guardian_phone: string | null
          is_present: boolean
          cancellation_token: string
          created_at: string
        }
        Insert: {
          id?: string
          shift_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          has_pelinohjauskoulutus?: boolean
          has_ea1?: boolean
          has_ajokortti?: boolean
          has_jarjestyksenvalvontakortti?: boolean
          shirt_size?: string | null
          notes?: string | null
          status?: string
          gdpr_accepted?: boolean
          is_under_13?: boolean
          guardian_phone?: string | null
          is_present?: boolean
          cancellation_token?: string
          created_at?: string
        }
        Update: {
          status?: string
          notes?: string | null
          is_present?: boolean
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
          confirmed_count: number
          present_count: number
          no_show_count: number
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
export type Location = Database['public']['Tables']['locations']['Row']

export type EventInsert = Database['public']['Tables']['events']['Insert']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert']
export type RegistrationInsert = Database['public']['Tables']['registrations']['Insert']
export type EmailQueue = Database['public']['Tables']['email_queue']['Row']
