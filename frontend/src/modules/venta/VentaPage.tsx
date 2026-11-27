import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ShoppingBasket,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { ElegirMedioSheet } from "@/components/pago/ElegirMedioSheet";
import { FormaPago } from "@/components/pago/FormaPago";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTicket } from "@/contexts/TicketContext";
import { ApiError } from "@/lib/api";
import { cajaApi } from "@/lib/caja";
import { dinero } from "@/lib/inventario";
import { REFRESCO_RAPIDO } from "@/lib/queryClient";
import {
  pagoValido,
  totalTicket,
  ventaApi,
  type ItemCatalogo,
  type LineaTicket,
  type MedioTransferencia,
  type MetodoPago,
  type SolicitudVenta,
  type VentaResponse,
} from "@/lib/venta";
import { CatalogoProductos } from "./CatalogoProductos";
import { EnvioSheet } from "./EnvioSheet";

export default function VentaPage() {
  const cliente = useQueryClient();
  const { lineas, setLineas, limpiar } = useTicket();
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [ticketAbierto, setTicketAbierto] = useState(false);
  const [elegirMedio, setElegirMedio] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<VentaResponse | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [envioAbierto, setEnvioAbierto] = useState(false);
  const [avisoEnvio, setAvisoEnvio] = useState<string | null>(null);

  const caja = useQuery({
    queryKey: ["caja", "actual"],
    queryFn: cajaApi.actual,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const registrar = useMutation({
    mutationFn: (datos: SolicitudVenta) => ventaApi.registrar(datos),
    onSuccess: async (venta) => {
      setVentaExitosa(venta);
      limpiar();
      setAvisoEnvio(null);
      setRecibido("");
      setEfectivo("");
      setTicketAbierto(false);
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["catalogo"] }),
        cliente.invalidateQueries({ queryKey: ["productos"] }),
        cliente.invalidateQueries({ queryKey: ["caja"] }),
      ]);
    },
    onError: (fallo: Error) => {
      setMensaje(fallo.message);
      if (fallo instanceof ApiError && (fallo.status === 404 || fallo.status === 409)) {
        void Promise.all([
          cliente.invalidateQueries({ queryKey: ["catalogo"] }),
          cliente.invalidateQueries({ queryKey: ["productos"] }),
          cliente.invalidateQueries({ queryKey: ["caja"] }),
        ]);
      }
    },
  });

  const total = totalTicket(lineas);
  const recibidoNumero = Number(recibido);
  const efectivoNumero = Number(efectivo);
  const cajaAbierta = caja.data?.abierta === true;
  const puedeFinalizar =
    cajaAbierta && lineas.length > 0 && pagoValido(metodoPago, total, recibidoNumero, efectivoNumero);

  function agregar(producto: ItemCatalogo) {
    setMensaje(null);
    setAvisoEnvio(null);
    setLineas((actuales) => {
      const maximo = Number(producto.stock);
      const actual = actuales.find((linea) => linea.producto.id === producto.id);
      if (actual) {
        return actuales.map((linea) =>
          linea.producto.id === producto.id
            ? { ...linea, cantidad: Math.min(maximo, linea.cantidad + 1) }
            : linea,
        );
      }
      return [...actuales, { producto, cantidad: Math.max(0, Math.min(maximo, 1)) }];
    });
  }

  function cambiarCantidad(id: number, valor: string) {
    const numero = Number(valor);
    setLineas((actuales) =>
      !Number.isFinite(numero) || numero <= 0
        ? actuales.filter((linea) => linea.producto.id !== id)
        : actuales.map((linea) =>
            linea.producto.id === id
              ? {
                  ...linea,
                  cantidad: Math.min(Number(linea.producto.stock), numero),
                }
              : linea,
          ),
    );
  }

  function quitar(id: number) {
    setLineas((actuales) => actuales.filter((linea) => linea.producto.id !== id));
  }

  function finalizar() {
    setMensaje(null);
    if (!puedeFinalizar) return;
    setTicketAbierto(false);
    if (metodoPago === "EFECTIVO") {
      registrar.mutate({
        items: lineas.map((linea) => ({
          productoId: linea.producto.id,
          cantidad: linea.cantidad,
        })),
        metodoPago,
        efectivoRecibido: recibidoNumero,
        medioTransferencia: null,
      });
    } else {
      setElegirMedio(true);
    }
  }

  function confirmarMedio(medio: MedioTransferencia) {
    setElegirMedio(false);
    registrar.mutate({
      items: lineas.map((linea) => ({
        productoId: linea.producto.id,
        cantidad: linea.cantidad,
      })),
      metodoPago,
      montoEfectivo: metodoPago === "AMBOS" ? efectivoNumero : null,
      medioTransferencia: medio,
    });
  }

  const ticket = (idBase: string) => (
    <Ticket
      idBase={idBase}
      lineas={lineas}
      total={total}
      metodoPago={metodoPago}
      onMetodo={(metodo) => {
        setMensaje(null);
        setMetodoPago(metodo);
      }}
      recibido={recibido}
      onRecibido={setRecibido}
      efectivo={efectivo}
      onEfectivo={setEfectivo}
      cajaAbierta={cajaAbierta}
      puedeFinalizar={puedeFinalizar}
      pendiente={registrar.isPending}
      mensaje={mensaje}
      onCantidad={cambiarCantidad}
      onQuitar={quitar}
      onFinalizar={finalizar}
      onEnviar={() => setEnvioAbierto(true)}
      avisoEnvio={avisoEnvio}
    />
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            <CatalogoProductos onSeleccionar={agregar} />
          </CardContent>
        </Card>

        <div className="hidden lg:block lg:sticky lg:top-5">{ticket("escritorio")}</div>
      </div>

      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-line bg-surface px-4 py-3 shadow-card lg:hidden">
        <Button
          type="button"
          className="mx-auto flex h-12 w-full max-w-md items-center justify-between px-5"
          onClick={() => setTicketAbierto(true)}
          aria-label={`Ver venta · ${dinero(total)}`}
        >
          <span className="flex items-center gap-2">
            <ShoppingCart />
            Ver venta
          </span>
          <span>{dinero(total)}</span>
        </Button>
      </div>

      <Sheet open={ticketAbierto} onOpenChange={setTicketAbierto}>
        <SheetContent side="bottom" title="Venta" className="lg:hidden">
          {ticket("movil")}
        </SheetContent>
      </Sheet>

      <ElegirMedioSheet
        abierto={elegirMedio}
        total={total}
        onElegir={confirmarMedio}
        onCerrar={() => setElegirMedio(false)}
      />

      <Sheet
        open={ventaExitosa !== null}
        onOpenChange={(estado) => !estado && setVentaExitosa(null)}
      >
        <SheetContent
          side="bottom"
          title="Venta registrada"
          className="sm:inset-y-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:w-[min(100%,420px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/20 text-[#3d8f83]">
              <CheckCircle2 />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">Venta registrada</h3>
            <p className="mt-1 text-sm text-ink-soft">Total cobrado</p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {dinero(ventaExitosa?.total)}
            </p>
            {ventaExitosa && Number(ventaExitosa.vuelto) > 0 && (
              <p className="mt-2 text-sm text-ink-soft">
                Vuelto a dar: {dinero(ventaExitosa.vuelto)}
              </p>
            )}
          </div>
          <Button
            type="button"
            className="mt-6 w-full"
            onClick={() => setVentaExitosa(null)}
          >
            Nueva venta
          </Button>
        </SheetContent>
      </Sheet>

      <EnvioSheet
        abierto={envioAbierto}
        onOpenChange={setEnvioAbierto}
        lineas={lineas}
        onEnviado={() => {
          limpiar();
          setAvisoEnvio("Envío registrado.");
        }}
      />
    </div>
  );
}

interface TicketProps {
  idBase: string;
  lineas: LineaTicket[];
  total: number;
  metodoPago: MetodoPago;
  onMetodo: (metodo: MetodoPago) => void;
  recibido: string;
  onRecibido: (valor: string) => void;
  efectivo: string;
  onEfectivo: (valor: string) => void;
  cajaAbierta: boolean;
  puedeFinalizar: boolean;
  pendiente: boolean;
  mensaje: string | null;
  onCantidad: (id: number, valor: string) => void;
  onQuitar: (id: number) => void;
  onFinalizar: () => void;
  onEnviar: () => void;
  avisoEnvio: string | null;
}

function Ticket({
  idBase,
  lineas,
  total,
  metodoPago,
  onMetodo,
  recibido,
  onRecibido,
  efectivo,
  onEfectivo,
  cajaAbierta,
  puedeFinalizar,
  pendiente,
  mensaje,
  onCantidad,
  onQuitar,
  onFinalizar,
  onEnviar,
  avisoEnvio,
}: TicketProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CardTitle>Ticket</CardTitle>
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${
                cajaAbierta ? "bg-success-strong" : "bg-danger"
              }`}
            />
            <span
              className={`text-sm font-semibold ${
                cajaAbierta ? "text-[#3d8f83]" : "text-[#c75f53]"
              }`}
            >
              {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
            </span>
          </div>
          <Button
            type="button"
            aria-label="Envío"
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={lineas.length === 0}
            onClick={onEnviar}
          >
            <ShoppingBasket />
            Envío
          </Button>
        </div>
        {avisoEnvio && (
          <p role="status" className="text-sm font-semibold text-[#3d8f83]">
            {avisoEnvio}
          </p>
        )}
        <p className="text-sm text-ink-soft">
          {lineas.length} {lineas.length === 1 ? "producto" : "productos"}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {lineas.length ? (
          <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {lineas.map((linea) => (
              <li key={linea.producto.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {linea.producto.nombre}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {dinero(linea.producto.precioVenta)}{" "}
                    {linea.producto.tipoVenta === "KILO" ? "x kilo" : "c/u"}
                  </p>
                </div>
                <input
                  type="number"
                  min="0.001"
                  max={linea.producto.stock}
                  step={linea.producto.tipoVenta === "KILO" ? "0.001" : "1"}
                  aria-label={`Cantidad de ${linea.producto.nombre}`}
                  value={linea.cantidad}
                  onChange={(evento) =>
                    onCantidad(linea.producto.id, evento.target.value)
                  }
                  className="h-11 w-20 rounded-field border border-line bg-surface px-2 text-center text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                />
                <span className="w-20 text-right text-sm font-bold text-ink">
                  {dinero(Number(linea.producto.precioVenta) * linea.cantidad)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${linea.producto.nombre}`}
                  onClick={() => onQuitar(linea.producto.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-field bg-app py-6 text-center text-sm text-ink-soft">
            Agrega productos del catálogo para empezar.
          </p>
        )}

        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm font-semibold text-ink-soft">Total</span>
          <span className="text-2xl font-bold text-ink">{dinero(total)}</span>
        </div>

        <FormaPago
          idBase={idBase}
          total={total}
          metodoPago={metodoPago}
          onMetodo={onMetodo}
          recibido={recibido}
          onRecibido={onRecibido}
          efectivo={efectivo}
          onEfectivo={onEfectivo}
          cajaAbierta={cajaAbierta}
          pendiente={pendiente}
          puedeFinalizar={puedeFinalizar}
          mensaje={mensaje}
          onFinalizar={onFinalizar}
        />
      </CardContent>
    </Card>
  );
}
