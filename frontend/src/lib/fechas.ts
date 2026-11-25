function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const resultado = new Date(valor);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

/** Horas en UTC, igual que se guardan en la base. */
export function hora(valor: string | null | undefined): string {
  const instante = aFecha(valor);
  if (!instante) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(instante);
}

export function fechaHora(valor: string | null | undefined): string {
  const instante = aFecha(valor);
  if (!instante) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(instante);
}
