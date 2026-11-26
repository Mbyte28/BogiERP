import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CajaResumen, ProductoCaja } from "@/lib/caja";
import { hora } from "@/lib/fechas";
import { cantidad, dinero } from "@/lib/inventario";
import type { VentaResponse } from "@/lib/venta";

const METODOS: Record<VentaResponse["metodoPago"], string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  AMBOS: "Ambos",
};

export interface DetalleCajaProps {
  resumen?: CajaResumen;
  ventas?: VentaResponse[];
  cargandoResumen?: boolean;
  cargandoVentas?: boolean;
  errorResumen?: string | null;
  errorVentas?: string | null;
}

/** Detalle compartido por Caja e Historial: KPIs, alerta y pestañas. */
export function DetalleCaja({
  resumen,
  ventas = [],
  cargandoResumen = false,
  cargandoVentas = false,
  errorResumen = null,
  errorVentas = null,
}: DetalleCajaProps) {
  const [vista, setVista] = useState<"general" | "ventas">("general");

  return (
    <div className="space-y-4">
      {errorResumen && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {errorResumen}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Total en caja" valor={dinero(resumen?.totalDinero)} />
        <Kpi titulo="Ventas" valor={String(resumen?.totalVentas ?? 0)} />
        <Kpi
          titulo="Unidades / kilos"
          valor={`${cantidad(resumen?.totalUnidades)} / ${cantidad(resumen?.totalKilos)}`}
        />
        <Kpi titulo="Ganancia" valor={dinero(resumen?.ganancia)} />
      </div>

      {Number(resumen?.itemsSinCosto ?? 0) > 0 && (
        <div className="rounded-card bg-warning/20 px-5 py-4 text-sm text-[#a87733]">
          {resumen?.itemsSinCosto} productos se vendieron sin costo registrado; su ganancia no se
          puede calcular.
        </div>
      )}

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>Detalle de la caja</CardTitle>
          <div
            role="tablist"
            aria-label="Vista de la caja"
            className="grid grid-cols-2 gap-1 rounded-full bg-app p-1 sm:flex sm:w-fit"
          >
            <BotonTab
              activo={vista === "general"}
              nombre="General"
              onClick={() => setVista("general")}
            />
            <BotonTab
              activo={vista === "ventas"}
              nombre="Por venta"
              onClick={() => setVista("ventas")}
            />
          </div>
        </CardHeader>
        <CardContent>
          {cargandoResumen ? (
            <p className="py-8 text-center text-sm text-ink-soft">Cargando resumen…</p>
          ) : vista === "general" ? (
            <VistaGeneral productos={resumen?.productos ?? []} />
          ) : (
            <VistaVentas
              ventas={ventas}
              cargando={cargandoVentas}
              error={errorVentas}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BotonTab({
  activo,
  nombre,
  onClick,
}: {
  activo: boolean;
  nombre: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
        activo ? "bg-primary-500 text-white" : "text-ink-soft hover:bg-surface"
      }`}
    >
      {nombre}
    </button>
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

function VistaGeneral({ productos }: { productos: ProductoCaja[] }) {
  if (!productos.length) {
    return <p className="py-8 text-center text-sm text-ink-soft">Aún no hay ventas en esta caja.</p>;
  }
  const gananciaAcumulada = productos.reduce(
    (suma, producto) => suma + Number(producto.ganancia ?? 0),
    0,
  );
  return (
    <div>
      <ul className="divide-y divide-line/70">
        {productos.map((producto) => (
          <li key={producto.productoId} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {producto.nombreProducto}
              </p>
            </div>
            {producto.tieneItemsSinCosto && <Badge variant="warning">Sin costo</Badge>}
            <div className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 text-right sm:flex-nowrap">
              <span className="whitespace-nowrap text-sm font-bold text-ink">
                {cantidad(producto.cantidadTotal)} {producto.tipoVenta === "KILO" ? "kg" : "uni."}
              </span>
              <span className="whitespace-nowrap text-sm font-semibold text-ink-soft">
                {dinero(producto.ventasTotal)}
              </span>
              <span className="w-full whitespace-nowrap text-xs font-semibold text-[#3d8f83]">
                Ganancia {dinero(producto.ganancia)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
        <span className="font-semibold text-ink-soft">Ganancia acumulada</span>
        <span className="font-bold text-[#3d8f83]">{dinero(gananciaAcumulada)}</span>
      </p>
    </div>
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
                <Badge variant="success">
                  {venta.medioTransferencia === "YAPE" ? "Yape" : "Plin"}
                </Badge>
              )}
            </div>
            <span className="text-sm font-bold text-ink">{dinero(venta.total)}</span>
          </div>
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
            {venta.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {cantidad(item.cantidad)} {item.tipoVenta === "KILO" ? "kg" : "uni."} ·{" "}
                  {item.nombreProducto}
                </span>
                <span className="shrink-0 font-semibold text-ink">{dinero(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          {Number(venta.vuelto) > 0 && (
            <p className="mt-2 text-xs text-ink-soft">Vuelto: {dinero(venta.vuelto)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
