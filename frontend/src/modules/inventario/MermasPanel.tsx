import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cantidad, dinero, fecha, inventarioApi, type Producto } from "@/lib/inventario";
import { MermaForm } from "./MermaForm";

function mesActual(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date());
}

export function MermasPanel() {
  const [mes, setMes] = useState(mesActual);
  const [abierto, setAbierto] = useState(false);
  const [productoInicial, setProductoInicial] = useState<number | null>(null);

  const mermas = useQuery({
    queryKey: ["mermas", mes],
    queryFn: () => inventarioApi.mermas(mes),
  });
  const productos = useQuery({
    queryKey: ["productos-mermas"],
    queryFn: () => inventarioApi.productos({ size: 100 }),
  });

  const lista = mermas.data ?? [];
  const opciones: Producto[] = productos.data?.items ?? [];
  const total = lista.reduce((suma, merma) => suma + Number(merma.total ?? 0), 0);

  function abrir(productoId: number | null = null) {
    setProductoInicial(productoId);
    setAbierto(true);
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Mermas del mes</CardTitle>
          <p className="mt-1 text-sm text-ink-soft">
            Pérdidas registradas. Se descuentan de la ganancia del mes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            aria-label="Mes de las mermas"
            value={mes}
            onChange={(evento) => setMes(evento.target.value || mesActual())}
            className="h-11 rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          />
          <Button type="button" size="sm" onClick={() => abrir()}>
            <Plus />
            <span className="hidden sm:inline">Registrar merma</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-field bg-app px-4 py-3">
          <span className="text-sm font-semibold text-ink-soft">Total del mes</span>
          <span className="text-base font-bold text-ink">{dinero(total)}</span>
        </div>

        {mermas.error && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {mermas.error instanceof Error
              ? mermas.error.message
              : "No se pudieron cargar las mermas."}
          </p>
        )}

        {mermas.isPending ? (
          <p className="py-6 text-center text-sm text-ink-soft">Cargando mermas…</p>
        ) : lista.length ? (
          <ul className="divide-y divide-line/70">
            {lista.map((merma) => (
              <li key={merma.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{merma.productoNombre}</p>
                  <p className="text-xs text-ink-soft">
                    {fecha(merma.creadoEn)} · {merma.motivo}
                  </p>
                </div>
                <Badge variant="danger">
                  −{cantidad(merma.cantidad)} {merma.costoUnitario ? "registrada" : "sin costo"}
                </Badge>
                <span className="min-w-24 text-right text-sm font-bold text-ink">
                  {dinero(merma.total)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-ink-soft">No hay mermas en este mes.</p>
        )}
      </CardContent>

      <Sheet open={abierto} onOpenChange={(estado) => !estado && setAbierto(false)}>
        <SheetContent
          side="bottom"
          title="Registrar merma"
          className="sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(100%,480px)] sm:rounded-l-3xl sm:rounded-t-none"
        >
          <MermaForm
            key={productoInicial ?? "general"}
            productos={opciones}
            productoIdInicial={productoInicial}
            onGuardado={() => setAbierto(false)}
            onCancelar={() => setAbierto(false)}
          />
        </SheetContent>
      </Sheet>
    </Card>
  );
}
