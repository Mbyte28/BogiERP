import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cajaApi } from "@/lib/caja";
import { cantidad, dinero } from "@/lib/inventario";
import type { VentaResponse } from "@/lib/venta";

const METODOS: Record<VentaResponse["metodoPago"], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  AMBOS: "Ambos",
};

export default function CajaPage() {
  const cliente = useQueryClient();
  const [vista, setVista] = useState<"general" | "ventas">("general");
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const caja = useQuery({ queryKey: ["caja", "actual"], queryFn: cajaApi.actual });
  const id = caja.data?.caja?.cajaId ?? null;
  const abierta = caja.data?.abierta === true;

  const resumen = useQuery({
    queryKey: ["caja", id, "resumen"],
    queryFn: () => cajaApi.resumen(id as number),
    enabled: abierta && id !== null,
  });
  const ventas = useQuery({
    queryKey: ["caja", id, "ventas"],
    queryFn: () => cajaApi.ventas(id as number),
    enabled: abierta && id !== null && vista === "ventas",
  });

  const abrir = useMutation({
    mutationFn: cajaApi.abrir,
    onSuccess: async () => {
      setMensaje(null);
      setVista("general");
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

  function recargar() {
    setMensaje(null);
    void cliente.invalidateQueries({ queryKey: ["caja"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Caja</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Resumen de la caja actual y detalle de cada venta.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={recargar}>
          Actualizar
        </Button>
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
        <>
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

          {resumen.error && (
            <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
              {resumen.error instanceof Error
                ? resumen.error.message
                : "No se pudo cargar el resumen."}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi titulo="Total en caja" valor={dinero(resumen.data?.totalDinero)} />
            <Kpi titulo="Ventas" valor={String(resumen.data?.totalVentas ?? 0)} />
            <Kpi
              titulo="Unidades / kilos"
              valor={`${cantidad(resumen.data?.totalUnidades)} / ${cantidad(resumen.data?.totalKilos)}`}
            />
            <Kpi titulo="Ganancia" valor={dinero(resumen.data?.ganancia)} />
          </div>

          {Number(resumen.data?.itemsSinCosto ?? 0) > 0 && (
            <div className="rounded-card bg-warning/20 px-5 py-4 text-sm text-[#a87733]">
              {resumen.data?.itemsSinCosto} productos se vendieron sin costo registrado; su
              ganancia no se puede calcular.
            </div>
          )}

          <Card>
            <CardHeader className="gap-4">
              <CardTitle>Detalle de la caja</CardTitle>
              <div role="tablist" aria-label="Vista de la caja" className="grid grid-cols-2 gap-1 rounded-full bg-app p-1 sm:flex sm:w-fit">
                <button
                  type="button"
                  role="tab"
                  aria-selected={vista === "general"}
                  onClick={() => setVista("general")}
                  className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
                    vista === "general"
                      ? "bg-primary-500 text-white"
                      : "text-ink-soft hover:bg-surface"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={vista === "ventas"}
                  onClick={() => setVista("ventas")}
                  className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
                    vista === "ventas"
                      ? "bg-primary-500 text-white"
                      : "text-ink-soft hover:bg-surface"
                  }`}
                >
                  Por venta
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {vista === "general" ? (
                <VistaGeneral productos={resumen.data?.productos ?? []} />
              ) : (
                <VistaVentas
                  ventas={ventas.data ?? []}
                  cargando={ventas.isPending}
                  error={ventas.error instanceof Error ? ventas.error.message : null}
                />
              )}
            </CardContent>
          </Card>
        </>
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

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase text-ink-soft">{titulo}</p>
        <p className="mt-2 truncate text-xl font-bold text-ink">{valor}</p>
      </CardContent>
    </Card>
  );
}

function VistaGeneral({ productos }: { productos: import("@/lib/caja").ProductoCaja[] }) {
  if (!productos.length) {
    return <p className="py-8 text-center text-sm text-ink-soft">Aún no hay ventas en esta caja.</p>;
  }
  return (
    <ul className="divide-y divide-line/70">
      {productos.map((producto) => (
        <li key={producto.productoId} className="flex flex-wrap items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {producto.nombreProducto}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {producto.tipoVenta === "KILO" ? "Kilo" : "Unidad"} ·{" "}
              {dinero(producto.ventasTotal)} vendidos
            </p>
          </div>
          {producto.tieneItemsSinCosto && <Badge variant="warning">Sin costo</Badge>}
          <div className="text-right">
            <p className="text-sm font-bold text-ink">
              {cantidad(producto.cantidadTotal)}{" "}
              {producto.tipoVenta === "KILO" ? "kg" : "und"}
            </p>
            <p className="text-xs text-ink-soft">
              Ganancia {dinero(producto.ganancia)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VistaVentas({
  ventas,
  cargando,
  error,
}: {
  ventas: VentaResponse[];
  cargando: boolean;
  error: string | null;
}) {
  if (cargando) {
    return <p className="py-8 text-center text-sm text-ink-soft">Cargando ventas…</p>;
  }
  if (error) {
    return <p role="alert" className="py-8 text-center text-sm text-[#c75f53]">{error}</p>;
  }
  if (!ventas.length) {
    return <p className="py-8 text-center text-sm text-ink-soft">Aún no hay ventas en esta caja.</p>;
  }
  return (
    <ul className="space-y-3">
      {ventas.map((venta) => (
        <li key={venta.id} className="rounded-field border border-line bg-app p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">{hora(venta.creadoEn)}</span>
              <Badge variant={venta.metodoPago === "EFECTIVO" ? "default" : "info"}>
                {METODOS[venta.metodoPago]}
              </Badge>
              {venta.medioTransferencia && (
                <Badge variant="success">{venta.medioTransferencia === "YAPE" ? "Yape" : "Plin"}</Badge>
              )}
            </div>
            <span className="text-sm font-bold text-ink">{dinero(venta.total)}</span>
          </div>
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
            {venta.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {cantidad(item.cantidad)} {item.tipoVenta === "KILO" ? "kg" : "und"} ·{" "}
                  {item.nombreProducto}
                </span>
                <span className="shrink-0 font-semibold text-ink">{dinero(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          {Number(venta.vuelto) > 0 && (
            <p className="mt-2 text-xs text-ink-soft">
              Vuelto: {dinero(venta.vuelto)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function hora(valor: string | undefined): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(fecha);
}
