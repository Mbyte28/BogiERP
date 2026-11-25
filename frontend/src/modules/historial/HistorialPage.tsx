import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fechaHora } from "@/lib/fechas";
import { historialApi } from "@/lib/historial";
import { cantidad, dinero } from "@/lib/inventario";
import { DetalleCaja } from "@/modules/caja/DetalleCaja";

const TAMANO = 30;

export default function HistorialPage() {
  const [pagina, setPagina] = useState(0);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  const cajas = useQuery({
    queryKey: ["historial", "cajas", pagina],
    queryFn: () => historialApi.cajas({ page: pagina, size: TAMANO }),
  });
  const detalle = useQuery({
    queryKey: ["historial", "caja", seleccionada],
    queryFn: () => historialApi.detalle(seleccionada as number),
    enabled: seleccionada !== null,
  });

  if (seleccionada !== null) {
    const error = detalle.error instanceof Error ? detalle.error.message : null;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => setSeleccionada(null)}
              className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft />
              Volver al historial
            </button>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-ink sm:text-xl">
              Caja #{seleccionada}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Abierta el {fechaHora(detalle.data?.resumen.abiertaEn)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void detalle.refetch()}
          >
            Actualizar
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {error}
          </p>
        )}

        <DetalleCaja
          resumen={detalle.data?.resumen}
          ventas={detalle.data?.ventas ?? []}
          cargandoResumen={detalle.isPending}
          cargandoVentas={detalle.isPending}
          errorResumen={error}
          errorVentas={error}
        />
      </div>
    );
  }

  const items = cajas.data?.items ?? [];
  const total = cajas.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Historial</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Consulta las cajas registradas y revisa el detalle de cada una.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cajas registradas</CardTitle>
          <p className="text-sm text-ink-soft">
            Ordenadas de la más reciente a la más antigua.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {cajas.error && (
            <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
              {cajas.error instanceof Error
                ? cajas.error.message
                : "No se pudo cargar el historial."}
            </p>
          )}

          {cajas.isPending ? (
            <p className="py-8 text-center text-sm text-ink-soft">Cargando cajas…</p>
          ) : items.length ? (
            <>
              <ul className="divide-y divide-line/70">
                {items.map((caja) => (
                  <li key={caja.cajaId}>
                    <button
                      type="button"
                      onClick={() => setSeleccionada(caja.cajaId)}
                      aria-label={`Ver caja del ${fechaHora(caja.abiertaEn)}`}
                      className="flex min-h-16 w-full items-center gap-3 py-3 text-left transition-colors hover:bg-app"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-ink">
                            {fechaHora(caja.abiertaEn)}
                          </span>
                          <Badge variant={caja.abierta ? "warning" : "success"}>
                            {caja.abierta ? "Abierta" : "Cerrada"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {caja.cerradaEn
                            ? `Cerrada el ${fechaHora(caja.cerradaEn)}`
                            : "En curso"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-ink">{dinero(caja.totalDinero)}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {caja.totalVentas} {caja.totalVentas === 1 ? "venta" : "ventas"} ·{" "}
                          {cantidad(caja.totalUnidades)} und / {cantidad(caja.totalKilos)} kg
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-sm text-ink-soft">
                  {total} {total === 1 ? "caja" : "cajas"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Página anterior"
                    disabled={pagina === 0}
                    onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-16 text-center text-sm font-semibold text-ink">
                    {pagina + 1} / {totalPaginas}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Página siguiente"
                    disabled={pagina + 1 >= totalPaginas}
                    onClick={() => setPagina((actual) => actual + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">
              Aún no hay cajas registradas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
