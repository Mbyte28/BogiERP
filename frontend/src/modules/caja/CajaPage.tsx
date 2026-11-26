import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cajaApi } from "@/lib/caja";
import { hora } from "@/lib/fechas";
import { dinero } from "@/lib/inventario";
import { REFRESCO_RAPIDO } from "@/lib/queryClient";
import { DetalleCaja } from "./DetalleCaja";

export default function CajaPage() {
  const cliente = useQueryClient();
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const caja = useQuery({
    queryKey: ["caja", "actual"],
    queryFn: cajaApi.actual,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const id = caja.data?.caja?.cajaId ?? null;
  const abierta = caja.data?.abierta === true;

  const resumen = useQuery({
    queryKey: ["caja", id, "resumen"],
    queryFn: () => cajaApi.resumen(id as number),
    enabled: abierta && id !== null,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const ventas = useQuery({
    queryKey: ["caja", id, "ventas"],
    queryFn: () => cajaApi.ventas(id as number),
    enabled: abierta && id !== null,
    refetchInterval: REFRESCO_RAPIDO,
  });

  const abrir = useMutation({
    mutationFn: cajaApi.abrir,
    onSuccess: async () => {
      setMensaje(null);
      await cliente.invalidateQueries({ queryKey: ["caja"] });
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });
  const cerrar = useMutation({
    mutationFn: cajaApi.cerrar,
    onSuccess: async () => {
      setMensaje(null);
      setConfirmarCierre(false);
      await cliente.invalidateQueries({ queryKey: ["caja"] });
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Caja</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Resumen de la caja actual y detalle de cada venta. Se actualiza automáticamente.
        </p>
      </div>

      {mensaje && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {mensaje}
        </p>
      )}

      {caja.isPending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-soft">
            Cargando caja…
          </CardContent>
        </Card>
      ) : !abierta ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay caja abierta</CardTitle>
            <p className="text-sm text-ink-soft">
              Abre la caja para comenzar a registrar ventas.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              disabled={abrir.isPending}
              onClick={() => abrir.mutate()}
            >
              {abrir.isPending ? "Abriendo…" : "Abrir caja"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">Caja abierta</Badge>
              <span className="text-xs text-ink-soft">
                Desde {hora(resumen.data?.abiertaEn)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmarCierre(true)}
            >
              Cerrar caja
            </Button>
          </div>

          <DetalleCaja
            resumen={resumen.data}
            ventas={ventas.data ?? []}
            cargandoResumen={resumen.isPending}
            cargandoVentas={ventas.isPending}
            errorResumen={
              resumen.error instanceof Error ? resumen.error.message : null
            }
            errorVentas={ventas.error instanceof Error ? ventas.error.message : null}
          />
        </div>
      )}

      <Sheet open={confirmarCierre} onOpenChange={(estado) => !estado && setConfirmarCierre(false)}>
        <SheetContent
          side="bottom"
          title="Cerrar caja"
          className="sm:inset-y-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:w-[min(100%,420px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <h3 className="text-lg font-bold text-ink">¿Cerrar la caja?</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Se registrará el cierre con {resumen.data?.totalVentas ?? 0} ventas y{" "}
            {dinero(resumen.data?.totalDinero)}. Después podrás verla en el historial.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmarCierre(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={cerrar.isPending}
              onClick={() => cerrar.mutate()}
            >
              {cerrar.isPending ? "Cerrando…" : "Cerrar caja"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
