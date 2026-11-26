import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building, DoorStairwell, House, Truck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import { clientesApi, type Departamento } from "@/lib/clientes";
import { cantidad, dinero } from "@/lib/inventario";
import { REFRESCO_RAPIDO } from "@/lib/queryClient";
import { totalTicket, type LineaTicket } from "@/lib/venta";

const AVISO_UBICACION_ELIMINADA =
  "Esa ubicación ya no existe. Se actualizó el edificio; elígela de nuevo para continuar.";

interface EnvioSheetProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  lineas: LineaTicket[];
  onEnviado: () => void;
}

/** Selector de torre, piso y departamento para generar un envío desde Ventas. */
export function EnvioSheet({ abierto, onOpenChange, lineas, onEnviado }: EnvioSheetProps) {
  const queryClient = useQueryClient();
  const [torre, setTorre] = useState<number | null>(null);
  const [piso, setPiso] = useState<number | null>(null);
  const [departamento, setDepartamento] = useState<Departamento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reiniciar() {
    setTorre(null);
    setPiso(null);
    setDepartamento(null);
  }

  useEffect(() => {
    if (!abierto) {
      reiniciar();
      setAviso(null);
      setError(null);
    }
  }, [abierto]);

  const config = useQuery({
    queryKey: ["clientes", "config"],
    queryFn: clientesApi.configuracion,
    enabled: abierto,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const configurado = config.data?.configurado === true;

  const torres = useQuery({
    queryKey: ["clientes", "torres"],
    queryFn: clientesApi.torres,
    enabled: abierto && configurado && torre === null,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const pisos = useQuery({
    queryKey: ["clientes", "pisos", torre],
    queryFn: () => clientesApi.pisos(torre as number),
    enabled: abierto && configurado && torre !== null && piso === null,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const departamentos = useQuery({
    queryKey: ["clientes", "departamentos", torre, piso],
    queryFn: () => clientesApi.departamentos(torre as number, piso as number),
    enabled: abierto && configurado && torre !== null && piso !== null && departamento === null,
    refetchInterval: REFRESCO_RAPIDO,
  });

  function reiniciarPorCambioExterno() {
    reiniciar();
    setAviso(AVISO_UBICACION_ELIMINADA);
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ["clientes"] });
  }

  const registrar = useMutation({
    mutationFn: clientesApi.registrarEnvio,
    onSuccess: async () => {
      setError(null);
      onOpenChange(false);
      onEnviado();
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (fallo) => {
      if (fallo instanceof ApiError && fallo.status === 404 && /departamento/i.test(fallo.message)) {
        reiniciarPorCambioExterno();
        return;
      }
      setError(fallo instanceof Error ? fallo.message : "No se pudo registrar el envío.");
    },
  });

  function confirmar() {
    if (!departamento || lineas.length === 0) return;
    setAviso(null);
    setError(null);
    registrar.mutate({
      departamentoId: departamento.id,
      items: lineas.map((linea) => ({
        productoId: linea.producto.id,
        cantidad: linea.cantidad,
      })),
    });
  }

  type Opcion = {
    clave: number;
    etiqueta: string;
    Icono: LucideIcon;
    seleccionar: () => void;
  };
  const opciones: Opcion[] =
    torre === null
      ? (torres.data ?? []).map((item) => ({
          clave: item.torre,
          etiqueta: `Torre ${item.torre}`,
          Icono: Building,
          seleccionar: () => setTorre(item.torre),
        }))
      : piso === null
        ? (pisos.data ?? []).map((item) => ({
            clave: item.piso,
            etiqueta: `Piso ${item.piso}`,
            Icono: DoorStairwell,
            seleccionar: () => setPiso(item.piso),
          }))
        : (departamentos.data ?? []).map((item) => ({
            clave: item.id,
            etiqueta: `Depto ${item.numero}`,
            Icono: House,
            seleccionar: () => setDepartamento(item),
          }));

  const actual = torre === null ? torres : piso === null ? pisos : departamentos;
  const titulo = departamento
    ? departamento.etiqueta
    : piso !== null
      ? `Torre ${torre} · Piso ${piso}`
      : torre !== null
        ? `Torre ${torre}`
        : "Elige la torre";

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" title="Envío" className="overflow-y-auto">
        <div className="mb-4 pr-10">
          <h3 className="text-lg font-bold tracking-tight text-ink">Envío</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Elige la torre, el piso y el departamento para enviar los productos del ticket.
          </p>
        </div>

        <div className="mb-4 rounded-field border border-line bg-app p-4">
          <p className="text-xs font-semibold uppercase text-ink-soft">Productos del ticket</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {lineas.map((linea) => (
              <li key={linea.producto.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {cantidad(linea.cantidad)} {linea.producto.tipoVenta === "KILO" ? "kg" : "uni."} ·{" "}
                  {linea.producto.nombre}
                </span>
                <span className="shrink-0 font-semibold text-ink">
                  {dinero(Number(linea.producto.precioVenta) * linea.cantidad)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-line pt-2 text-sm">
            <span className="font-semibold text-ink-soft">Total</span>
            <span className="font-bold text-ink">{dinero(totalTicket(lineas))}</span>
          </p>
        </div>

        {aviso && (
          <p role="status" className="mb-3 rounded-field bg-success/15 px-4 py-3 text-sm text-[#3d8f83]">
            {aviso}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-3 rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {error}
          </p>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink">{titulo}</p>
          {(torre !== null || piso !== null) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (piso !== null ? setPiso(null) : setTorre(null))}
            >
              <ArrowLeft />
              Volver
            </Button>
          )}
        </div>

        {config.error && (
          <p role="alert" className="mb-3 rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {config.error instanceof Error
              ? config.error.message
              : "No se pudo cargar el edificio."}
          </p>
        )}
        {configurado && !config.error && actual.error && (
          <p role="alert" className="mb-3 rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {actual.error instanceof Error
              ? actual.error.message
              : "No se pudo cargar esta información."}
          </p>
        )}

        {!configurado && !config.isPending && !config.error ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            Configura el edificio en el módulo Envíos antes de registrar un envío.
          </p>
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-field border border-line/60 bg-app/40 p-4">
            {actual.isPending ? (
              <p className="py-6 text-center text-sm text-ink-soft">Cargando ubicaciones…</p>
            ) : departamento ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <House size={30} strokeWidth={1.6} aria-hidden="true" className="text-primary-500" />
                <p className="text-sm font-bold text-ink">{departamento.etiqueta}</p>
                <p className="text-xs text-ink-soft">Listo para confirmar el envío.</p>
              </div>
            ) : opciones.length ? (
              <div className="flex w-full flex-wrap justify-center gap-3">
                {opciones.map((opcion) => (
                  <button
                    key={opcion.clave}
                    type="button"
                    aria-label={opcion.etiqueta}
                    onClick={() => {
                      setAviso(null);
                      setError(null);
                      opcion.seleccionar();
                    }}
                    className="flex aspect-square min-h-24 w-36 max-w-full flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface p-2 text-center shadow-card outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-500/40"
                  >
                    <opcion.Icono size={26} strokeWidth={1.6} aria-hidden="true" className="text-primary-500" />
                    <span className="text-sm font-bold text-ink">{opcion.etiqueta}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-ink-soft">No hay ubicaciones disponibles.</p>
            )}
          </div>
        )}

        <Button
          type="button"
          className="mt-5 w-full"
          disabled={!departamento || lineas.length === 0 || registrar.isPending}
          onClick={confirmar}
        >
          <Truck />
          {registrar.isPending ? "Registrando…" : "Confirmar envío"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
