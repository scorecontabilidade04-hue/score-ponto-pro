// Motor de cálculo de jornada (Fase 4) — funções puras, sem acesso ao banco.

export type TipoRegistro = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida";

export type MarcacoesDia = Partial<Record<TipoRegistro, Date>>;

export type JornadaCalculo = {
  carga_diaria_minutos: number;
  hora_entrada: string | null;
  hora_saida: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
  dias_trabalhados: string | null;
};

export type ResultadoDia = {
  trabalhadoMinutos: number;
  previstoMinutos: number;
  intervaloMinutos: number;
  atrasoMinutos: number;
  saidaAntecipadaMinutos: number;
  excedenteMinutos: number;
  saldoMinutos: number;
  completo: boolean;
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export function minutosDoDia(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

/** "08:00" ou "08:00:00" -> 480 */
export function horaParaMinutos(v: string | null | undefined): number | null {
  if (!v) return null;
  const [h, m] = v.split(":");
  const hh = Number(h);
  const mm = Number(m ?? 0);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

export function formatarMinutos(total: number) {
  const sinal = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** O dia da data (YYYY-MM-DD) está previsto na escala da jornada? */
export function diaPrevisto(dataIso: string, jornada?: JornadaCalculo | null) {
  if (!jornada?.dias_trabalhados) return true;
  const [a, m, d] = dataIso.slice(0, 10).split("-").map(Number);
  const nome = DIAS_SEMANA[new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1).getDay()] ?? "";
  const lista = jornada.dias_trabalhados.toLowerCase();
  return lista.includes(nome);
}

export function calcularDia(
  dataIso: string,
  marcacoes: MarcacoesDia,
  jornada?: JornadaCalculo | null,
): ResultadoDia {
  const entrada = marcacoes.entrada;
  const saida = marcacoes.saida;
  const saiInt = marcacoes.saida_intervalo;
  const volInt = marcacoes.retorno_intervalo;

  let intervaloMinutos = 0;
  if (saiInt && volInt) {
    intervaloMinutos = Math.max(0, minutosDoDia(volInt) - minutosDoDia(saiInt));
  }

  const completo = !!entrada && !!saida;
  const trabalhadoMinutos = completo
    ? Math.max(0, minutosDoDia(saida!) - minutosDoDia(entrada!) - intervaloMinutos)
    : 0;

  const previstoMinutos =
    jornada && diaPrevisto(dataIso, jornada) ? (jornada.carga_diaria_minutos ?? 0) : 0;

  const entradaPrevista = horaParaMinutos(jornada?.hora_entrada);
  const saidaPrevista = horaParaMinutos(jornada?.hora_saida);

  const atrasoMinutos =
    entrada && entradaPrevista !== null && previstoMinutos > 0
      ? Math.max(0, minutosDoDia(entrada) - entradaPrevista)
      : 0;

  const saidaAntecipadaMinutos =
    saida && saidaPrevista !== null && previstoMinutos > 0
      ? Math.max(0, saidaPrevista - minutosDoDia(saida))
      : 0;

  const saldoMinutos = completo ? trabalhadoMinutos - previstoMinutos : 0;
  const excedenteMinutos = Math.max(0, saldoMinutos);

  return {
    trabalhadoMinutos,
    previstoMinutos,
    intervaloMinutos,
    atrasoMinutos,
    saidaAntecipadaMinutos,
    excedenteMinutos,
    saldoMinutos,
    completo,
  };
}

export function somarResultados(itens: ResultadoDia[]) {
  return itens.reduce<ResultadoDia>(
    (acc, r) => ({
      trabalhadoMinutos: acc.trabalhadoMinutos + r.trabalhadoMinutos,
      previstoMinutos: acc.previstoMinutos + r.previstoMinutos,
      intervaloMinutos: acc.intervaloMinutos + r.intervaloMinutos,
      atrasoMinutos: acc.atrasoMinutos + r.atrasoMinutos,
      saidaAntecipadaMinutos: acc.saidaAntecipadaMinutos + r.saidaAntecipadaMinutos,
      excedenteMinutos: acc.excedenteMinutos + r.excedenteMinutos,
      saldoMinutos: acc.saldoMinutos + r.saldoMinutos,
      completo: true,
    }),
    {
      trabalhadoMinutos: 0,
      previstoMinutos: 0,
      intervaloMinutos: 0,
      atrasoMinutos: 0,
      saidaAntecipadaMinutos: 0,
      excedenteMinutos: 0,
      saldoMinutos: 0,
      completo: true,
    },
  );
}
