import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cajaApi } from "@/lib/caja";
import {
  cantidad,
  dinero,
  inventarioApi,
  urlImagen,
} from "@/lib/inventario";
import { IconoCategoria } from "@/modules/inventario/IconoCategoria";
import {
  totalTicket,
  transferencia,
  ventaApi,
  vuelto,
  type ItemCatalogo,
  type LineaTicket,
  type MedioTransferencia,
  type MetodoPago,
  type SolicitudVenta,
  type VentaResponse,
} from "@/lib/venta";

const TAMANO = 25;
const METODOS: { clave: MetodoPago; nombre: string }[] = [
  { clave: "EFECTIVO", nombre: "Efectivo" },
  { clave: "TRANSFERENCIA", nombre: "Transferencia" },
  { clave: "AMBOS", nombre: "Ambos" },
];

export default function VentaPage() {
  const cliente = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [lineas, setLineas] = useState<LineaTicket[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [ticketAbierto, setTicketAbierto] = useState(false);
  const [elegirMedio, setElegirMedio] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<VentaResponse | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const caja = useQuery({ queryKey: ["caja", "actual"], queryFn: cajaApi.actual });
  const categorias = useQuery({
    queryKey: ["categorias"],
    queryFn: inventarioApi.categorias,
  });
  const catalogo = useQuery({
    queryKey: ["catalogo", busqueda, categoriaId, pagina],
    queryFn: () =>
      ventaApi.catalogo({ q: busqueda, categoriaId, page: pagina, size: TAMANO }),
  });

  const registrar = useMutation({
    mutationFn: (datos: SolicitudVenta) => ventaApi.registrar(datos),
    onSuccess: async (venta) => {
      setVentaExitosa(venta);
      setLineas([]);
      setRecibido("");
      setEfectivo("");
      setTicketAbierto(false);
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["catalogo"] }),
        cliente.invalidateQueries({ queryKey: ["productos"] }),
        cliente.invalidateQueries({ queryKey: ["caja"] }),
      ]);
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  const total = totalTicket(lineas);
  const recibidoNumero = Number(recibido);
  const efectivoNumero = Number(efectivo);
  const cajaAbierta = caja.data?.abierta === true;
  const pagoValido =
    metodoPago === "EFECTIVO"
      ? Number.isFinite(recibidoNumero) && recibidoNumero >= total
      : metodoPago === "AMBOS"
        ? efectivoNumero > 0 && efectivoNumero < total
        : true;
  const puedeFinalizar = cajaAbierta && lineas.length > 0 && total > 0 && pagoValido;

  function agregar(producto: ItemCatalogo) {
    setMensaje(null);
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

  const items = catalogo.data?.items ?? [];
  const totalItems = catalogo.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / TAMANO));

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
    />
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
          Registrar venta
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Elige los productos y cobra en efectivo, por transferencia o ambos.
        </p>
      </div>

      {!caja.isPending && !cajaAbierta && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-warning/20 px-5 py-4 text-sm text-[#a87733]"
        >
          <span>La caja está cerrada. Ábrela para poder registrar ventas.</span>
          <Button asChild size="sm" variant="outline">
            <Link to="/caja">Ir a caja</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Catálogo</CardTitle>
            <p className="text-sm text-ink-soft">
              Los más vendidos aparecen primero. Toca un producto para agregarlo.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Buscar productos"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPagina(0);
                }}
                placeholder="Buscar por nombre…"
                className="h-12 w-full rounded-field border border-line bg-surface pl-11 pr-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              />
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Filtrar por categoría">
              <BotonCategoria
                activo={categoriaId === null}
                icono="package"
                nombre="Todos"
                onClick={() => {
                  setCategoriaId(null);
                  setPagina(0);
                }}
              />
              {categorias.data?.map((categoria) => (
                <BotonCategoria
                  key={categoria.id}
                  activo={categoriaId === categoria.id}
                  icono={categoria.icono}
                  nombre={categoria.nombre}
                  onClick={() => {
                    setCategoriaId(categoria.id);
                    setPagina(0);
                  }}
                />
              ))}
            </div>

            {catalogo.error && (
              <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                {catalogo.error instanceof Error
                  ? catalogo.error.message
                  : "No se pudo cargar el catálogo."}
              </p>
            )}

            {catalogo.isPending ? (
              <p className="py-8 text-center text-sm text-ink-soft">Cargando productos…</p>
            ) : items.length ? (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((producto) => (
                    <TarjetaProducto
                      key={producto.id}
                      producto={producto}
                      sinStock={Number(producto.stock) <= 0}
                      onAgregar={() => agregar(producto)}
                    />
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-sm text-ink-soft">
                    {totalItems} {totalItems === 1 ? "producto" : "productos"}
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
                No hay productos con estos filtros.
              </p>
            )}
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

      <Sheet open={elegirMedio} onOpenChange={(estado) => !estado && setElegirMedio(false)}>
        <SheetContent
          side="bottom"
          title="Yape o Plin"
          className="sm:inset-y-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:w-[min(100%,420px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Wallet />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">¿Con qué billetera pagaron?</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Total a transferir: {dinero(total)}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {(["YAPE", "PLIN"] as const).map((medio) => (
              <Button
                key={medio}
                type="button"
                size="lg"
                variant={medio === "YAPE" ? "default" : "secondary"}
                onClick={() => confirmarMedio(medio)}
              >
                {medio === "YAPE" ? "Yape" : "Plin"}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}

function BotonCategoria({
  activo,
  icono,
  nombre,
  onClick,
}: {
  activo: boolean;
  icono: string | null;
  nombre: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
        activo
          ? "border-primary-500 bg-primary-50 text-primary-600"
          : "border-line bg-surface text-ink-soft hover:bg-app"
      }`}
    >
      <IconoCategoria nombre={icono} size={16} />
      {nombre}
    </button>
  );
}

function TarjetaProducto({
  producto,
  sinStock,
  onAgregar,
}: {
  producto: ItemCatalogo;
  sinStock: boolean;
  onAgregar: () => void;
}) {
  const fuente = urlImagen(producto.imagen);
  return (
    <li className="flex min-w-0 flex-col rounded-field border border-line bg-app p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-primary-600">
          {fuente ? (
            <img src={fuente} alt="" className="size-full object-cover" />
          ) : (
            <IconoCategoria nombre={producto.categoriaIcono} size={22} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{producto.nombre}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {producto.categoriaNombre ?? "Sin categoría"}
          </p>
          <p className="mt-1 text-sm font-bold text-primary-600">
            {dinero(producto.precioVenta)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Badge variant="info">
          {producto.tipoVenta === "KILO" ? "Kilo" : "Unidad"}
        </Badge>
        {producto.masVendido && <Badge variant="default">Más vendido</Badge>}
        {producto.sinCosto && <Badge variant="warning">Sin costo</Badge>}
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Stock: {cantidad(producto.stock)} {producto.tipoVenta === "KILO" ? "kg" : "und"}
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        disabled={sinStock}
        aria-label={`Agregar ${producto.nombre}`}
        onClick={onAgregar}
      >
        <Plus />
        {sinStock ? "Sin stock" : "Agregar"}
      </Button>
    </li>
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
}: TicketProps) {
  const recibidoNumero = Number(recibido);
  const efectivoNumero = Number(efectivo);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Ticket</CardTitle>
          <p className="text-sm text-ink-soft">
            {lineas.length} {lineas.length === 1 ? "producto" : "productos"}
          </p>
        </div>
        <Badge variant={cajaAbierta ? "success" : "warning"}>
          {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
        </Badge>
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
                    {dinero(linea.producto.precioVenta)} c/u
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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-ink-soft">
            Método de pago
          </p>
          <div role="group" aria-label="Método de pago" className="flex gap-2 rounded-full bg-app p-1">
            {METODOS.map((metodo) => (
              <button
                key={metodo.clave}
                type="button"
                aria-pressed={metodoPago === metodo.clave}
                onClick={() => onMetodo(metodo.clave)}
                className={`min-h-11 flex-1 rounded-full px-2 text-xs font-semibold transition-colors ${
                  metodoPago === metodo.clave
                    ? "bg-primary-500 text-white"
                    : "text-ink-soft hover:bg-surface"
                }`}
              >
                {metodo.nombre}
              </button>
            ))}
          </div>
        </div>

        {metodoPago === "EFECTIVO" && (
          <div className="space-y-3">
            <label
              htmlFor={`${idBase}-recibido`}
              className="block text-xs font-semibold uppercase text-ink-soft"
            >
              Recibido
            </label>
            <div className="flex gap-2">
              <input
                id={`${idBase}-recibido`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={recibido}
                onChange={(evento) => onRecibido(evento.target.value)}
                placeholder="0.00"
                className="h-12 min-w-0 flex-1 rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => onRecibido(String(total))}
              >
                Exacto
              </Button>
            </div>
            <p className="text-sm text-ink-soft">
              Vuelto a dar:{" "}
              <span className="font-bold text-ink">
                {dinero(vuelto(total, recibidoNumero))}
              </span>
            </p>
          </div>
        )}

        {metodoPago === "AMBOS" && (
          <div className="space-y-3">
            <label
              htmlFor={`${idBase}-efectivo`}
              className="block text-xs font-semibold uppercase text-ink-soft"
            >
              Efectivo
            </label>
            <input
              id={`${idBase}-efectivo`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={efectivo}
              onChange={(evento) => onEfectivo(evento.target.value)}
              placeholder="0.00"
              className="h-12 w-full rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            />
            <p className="text-sm text-ink-soft">
              Recibido en transferencia:{" "}
              <span className="font-bold text-ink">
                {dinero(transferencia(total, efectivoNumero))}
              </span>
            </p>
          </div>
        )}

        {metodoPago === "TRANSFERENCIA" && (
          <p className="rounded-field bg-info/10 px-4 py-3 text-sm text-info">
            Total a transferir: {dinero(total)}. Elige Yape o Plin al finalizar.
          </p>
        )}

        {mensaje && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {mensaje}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!puedeFinalizar || pendiente}
          onClick={onFinalizar}
        >
          {pendiente ? "Registrando…" : "Finalizar venta"}
        </Button>
      </CardContent>
    </Card>
  );
}
