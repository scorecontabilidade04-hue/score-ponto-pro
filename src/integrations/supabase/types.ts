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
      ajustes_ponto: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          motivo: string
          registro_id: string
          responsavel_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          motivo: string
          registro_id: string
          responsavel_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          motivo?: string
          registro_id?: string
          responsavel_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_ponto_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas: {
        Row: {
          created_at: string
          credito_minutos: number
          data: string
          debito_minutos: number
          empresa_id: string
          funcionario_id: string
          id: string
          saldo_minutos: number
        }
        Insert: {
          created_at?: string
          credito_minutos?: number
          data?: string
          debito_minutos?: number
          empresa_id: string
          funcionario_id: string
          id?: string
          saldo_minutos?: number
        }
        Update: {
          created_at?: string
          credito_minutos?: number
          data?: string
          debito_minutos?: number
          empresa_id?: string
          funcionario_id?: string
          id?: string
          saldo_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          configuracoes: Json
          created_at: string
          criado_por: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          nome_fantasia: string | null
          razao_social: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          criado_por?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          criado_por?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      funcionario_jornadas: {
        Row: {
          created_at: string
          empresa_id: string
          fim_em: string | null
          funcionario_id: string
          id: string
          inicio_em: string
          jornada_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          fim_em?: string | null
          funcionario_id: string
          id?: string
          inicio_em?: string
          jornada_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          fim_em?: string | null
          funcionario_id?: string
          id?: string
          inicio_em?: string
          jornada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_jornadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_jornadas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_jornadas_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          departamento: string | null
          email: string | null
          empresa_id: string
          id: string
          jornada_id: string | null
          nome: string
          telefone: string | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          jornada_id?: string | null
          nome: string
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          jornada_id?: string | null
          nome?: string
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
        ]
      }
      jornadas: {
        Row: {
          ativo: boolean
          carga_diaria_minutos: number
          carga_semanal_minutos: number
          created_at: string
          dias_descanso: string | null
          dias_trabalhados: string | null
          empresa_id: string
          hora_entrada: string | null
          hora_saida: string | null
          id: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
          nome: string
          tipo: Database["public"]["Enums"]["tipo_jornada"]
        }
        Insert: {
          ativo?: boolean
          carga_diaria_minutos?: number
          carga_semanal_minutos?: number
          created_at?: string
          dias_descanso?: string | null
          dias_trabalhados?: string | null
          empresa_id: string
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_jornada"]
        }
        Update: {
          ativo?: boolean
          carga_diaria_minutos?: number
          carga_semanal_minutos?: number
          created_at?: string
          dias_descanso?: string | null
          dias_trabalhados?: string | null
          empresa_id?: string
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_jornada"]
        }
        Relationships: [
          {
            foreignKeyName: "jornadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          created_at: string
          data: string
          dispositivo: string | null
          empresa_id: string
          funcionario_id: string
          hora: string
          id: string
          ip: string | null
          tipo: Database["public"]["Enums"]["tipo_registro"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data: string
          dispositivo?: string | null
          empresa_id: string
          funcionario_id: string
          hora?: string
          id?: string
          ip?: string | null
          tipo: Database["public"]["Enums"]["tipo_registro"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          dispositivo?: string | null
          empresa_id?: string
          funcionario_id?: string
          hora?: string
          id?: string
          ip?: string | null
          tipo?: Database["public"]["Enums"]["tipo_registro"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_ajuste: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          created_at: string
          data: string
          empresa_id: string
          funcionario_id: string
          hora_solicitada: string
          id: string
          motivo: string
          observacao: string | null
          registro_id: string | null
          solicitante_id: string
          status: string
          tipo: Database["public"]["Enums"]["tipo_registro"]
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string
          data: string
          empresa_id: string
          funcionario_id: string
          hora_solicitada: string
          id?: string
          motivo: string
          observacao?: string | null
          registro_id?: string | null
          solicitante_id?: string
          status?: string
          tipo: Database["public"]["Enums"]["tipo_registro"]
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string
          data?: string
          empresa_id?: string
          funcionario_id?: string
          hora_solicitada?: string
          id?: string
          motivo?: string
          observacao?: string | null
          registro_id?: string | null
          solicitante_id?: string
          status?: string
          tipo?: Database["public"]["Enums"]["tipo_registro"]
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_ajuste_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuste_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      empresa_atual: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pode_gerir_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "funcionario"
      tipo_contrato: "clt" | "estagiario"
      tipo_jornada:
        | "fixa"
        | "variavel"
        | "5x2"
        | "6x1"
        | "12x36"
        | "semana_espanhola"
        | "estagio"
      tipo_registro:
        | "entrada"
        | "saida_intervalo"
        | "retorno_intervalo"
        | "saida"
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
    Enums: {
      app_role: ["admin", "gestor", "funcionario"],
      tipo_contrato: ["clt", "estagiario"],
      tipo_jornada: [
        "fixa",
        "variavel",
        "5x2",
        "6x1",
        "12x36",
        "semana_espanhola",
        "estagio",
      ],
      tipo_registro: [
        "entrada",
        "saida_intervalo",
        "retorno_intervalo",
        "saida",
      ],
    },
  },
} as const
