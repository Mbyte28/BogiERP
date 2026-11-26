import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  ClipboardList,
  DoorStairwell,
  House,
  Plus,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  clientesApi,
  type Departamento,
  type Fiado,
  type ItemFiado,
  type NivelDeuda,
} from "@/lib/clientes";
import { fechaHora } from "@/lib/fechas";
import { cantidad, dinero } from "@/lib/inventario";
import { cn } from "@/lib/utils";

const ESTILO_CAMPO =
  "h-11 w-full rounded-field border border-line bg-app px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";

type Hoja =
  | { tipo: "fiados"; departamento: Departamento }
  | { tipo: "registrar"; departamento: Departamento }
  | { tipo: "deudas" };

type CuadroDatos = {
  clave: number;
  titulo: string;
  subtitulo: string;
  pie: string;
  conDeuda: boolean;
  etiqueta: string;
  Icono: LucideIcon;
  alSeleccionar: () => void;
};

function mensajeDe(error: unknown, respaldo: string): string {
  return error instanceof Error ? error.message : respaldo;
}

function Cuadro({ datos }: { datos: CuadroDatos }) {
  const Icono = datos.Icono;
  return (
    <button
      type="button"
      aria-label={datos.etiqueta}
      onClick={datos.alSeleccionar}
      className={cn(
        "flex aspect-square min-h-28 w-60 max-w-full flex-col items-center justify-center gap-1 rounded-card border px-2 py-3 text-center shadow-card outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-500/40",
        datos.conDeuda ? "border-danger bg-danger/10" : "border-success/70 bg-success/10",
      )}
    >
      <Icono size={30} strokeWidth={1.6} aria-hidden="true" className="text-primary-500" />
      <span
        aria-hidden="true"
        className={cn("size-2.5 rounded-full", datos.conDeuda ? "bg-danger" : "bg-success-strong")}
      />
      <span className="text-sm font-bold text-ink">{datos.titulo}</span>
      <span className="text-xs text-ink-soft">{datos.subtitulo}</span>
      <span
        className={cn(
          "mt-1 text-[11px] font-semibold leading-tight",
          datos.conDeuda ? "text-[#c75f53]" : "text-[#3d8f83]",
        )}
      >
        {datos.pie}
      </span>
    </button>
  );
}

function FilaFiado({
  fiado,
  pagando,
  onPagar,
}: {
  fiado: Fiado;
  pagando: boolean;
  onPagar: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink">{fiado.nombreProducto}</span>
          <Badge variant={fiado.estado === "PAGADO" ? "success" : "danger"}>
            {fiado.estado === "PAGADO" ? "Pagado" : "Pendiente"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {cantidad(fiado.cantidad)} {fiado.tipoVenta === "KILO" ? "kg" : "und"} ×{" "}
          {dinero(fiado.precioUnitario)} · {fechaHora(fiado.creadoEn)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-sm font-bold text-ink">{dinero(fiado.subtotal)}</span>
        {fiado.estado === "PENDIENTE" && (
          <Button type="button" size="sm" variant="secondary" disabled={pagando} onClick={onPagar}>
            {pagando ? "Pagando…" : "Marcar pagado"}
          </Button>
        )}
      </div>
    </li>
  );
}

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [torre, setTorre] = useState<number | null>(null);
  const [piso, setPiso] = useState<number | null>(null);
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const [torresTexto, setTorresTexto] = useState("1");
  const [pisosTexto, setPisosTexto] = useState("1");
  const [deptosTexto, setDeptosTexto] = useState("1");
  const [errorConfig, setErrorConfig] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [editarTorres, setEditarTorres] = useState("1");
  const [editarPisos, setEditarPisos] = useState("1");
  const [editarDeptos, setEditarDeptos] = useState("1");
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<string | null>(null);

  const [productoId, setProductoId] = useState("");
  const [cantidadTexto, setCantidadTexto] = useState("1");
  const [lineas, setLineas] = useState<ItemFiado[]>([]);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);

  const config = useQuery({
    queryKey: ["clientes", "config"],
    queryFn: clientesApi.configuracion,
  });
  const configurado = config.data?.configurado ?? false;

  const torres = useQuery({
    queryKey: ["clientes", "torres"],
    queryFn: clientesApi.torres,
    enabled: configurado && torre === null,
  });
  const pisos = useQuery({
    queryKey: ["clientes", "pisos", torre],
    queryFn: () => clientesApi.pisos(torre as number),
    enabled: configurado && torre !== null && piso === null,
  });
  const departamentos = useQuery({
    queryKey: ["clientes", "departamentos", torre, piso],
    queryFn: () => clientesApi.departamentos(torre as number, piso as number),
    enabled: configurado && torre !== null && piso !== null,
  });

  const nivel: NivelDeuda = piso !== null ? "piso" : torre !== null ? "torre" : "edificio";
  const deudas = useQuery({
    queryKey: ["clientes", "deudas", nivel, torre, piso],
    queryFn: () => clientesApi.deudas(nivel, torre ?? undefined, piso ?? undefined),
    enabled: configurado && hoja?.tipo === "deudas",
  });

  const idFiados = hoja?.tipo === "fiados" ? hoja.departamento.id : null;
  const fiados = useQuery({
    queryKey: ["clientes", "fiados", idFiados],
    queryFn: () => clientesApi.fiados(idFiados as number),
    enabled: idFiados !== null,
  });
  const productos = useQuery({
    queryKey: ["clientes", "productos"],
    queryFn: clientesApi.productos,
    enabled: hoja?.tipo === "registrar",
  });

  const configurar = useMutation({
    mutationFn: clientesApi.configurar,
    onSuccess: async () => {
      setErrorConfig(null);
      await queryClient.invalidateQueries({ queryKey: ["clientes", "config"] });
    },
    onError: (error) => {
      setErrorConfig(mensajeDe(error, "No se pudo configurar el edificio."));
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ["clientes", "config"] });
      }
    },
  });

  const reconfigurar = useMutation({
    mutationFn: clientesApi.reconfigurar,
    onSuccess: async () => {
      setEditando(false);
      setErrorEdicion(null);
      setBloqueo(null);
      setTorre(null);
      setPiso(null);
      setAviso("Estructura del edificio actualizada.");
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      const mensaje = mensajeDe(error, "No se pudo actualizar la estructura del edificio.");
      setErrorEdicion(mensaje);
      if (error instanceof ApiError && error.status === 409) setBloqueo(mensaje);
    },
  });

  const pagar = useMutation({
    mutationFn: clientesApi.pagar,
    onSuccess: async () => {
      setErrorAccion(null);
      setAviso("Fiado marcado como pagado.");
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      setErrorAccion(mensajeDe(error, "No se pudo marcar el fiado como pagado."));
    },
  });

  const registrar = useMutation({
    mutationFn: clientesApi.registrar,
    onSuccess: async () => {
      setLineas([]);
      setProductoId("");
      setCantidadTexto("1");
      setErrorRegistro(null);
      setAviso("Fiado registrado.");
      if (hoja?.tipo === "registrar") {
        setHoja({ tipo: "fiados", departamento: hoja.departamento });
      }
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      setErrorRegistro(mensajeDe(error, "No se pudo registrar el fiado."));
    },
  });

  function enviarConfiguracion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valores = [Number(torresTexto), Number(pisosTexto), Number(deptosTexto)];
    if (
      valores.some((valor) => !Number.isInteger(valor) || valor < 1) ||
      valores[2] > 99
    ) {
      setErrorConfig(
        "Ingresa valores enteros positivos; los departamentos por piso deben estar entre 1 y 99.",
      );
      return;
    }
    setErrorConfig(null);
    configurar.mutate({
      torres: valores[0],
      pisosPorTorre: valores[1],
      deptosPorPiso: valores[2],
    });
  }

  function abrirEditor() {
    setEditarTorres(String(config.data?.torres ?? 1));
    setEditarPisos(String(config.data?.pisosPorTorre ?? 1));
    setEditarDeptos(String(config.data?.deptosPorPiso ?? 1));
    setErrorEdicion(null);
    setBloqueo(null);
    setEditando(true);
  }

  function enviarEdicion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valores = [Number(editarTorres), Number(editarPisos), Number(editarDeptos)];
    if (
      valores.some((valor) => !Number.isInteger(valor) || valor < 1) ||
      valores[2] > 99 ||
      valores[0] * valores[1] * valores[2] > 10000
    ) {
      setErrorEdicion(
        "Ingresa valores enteros positivos, hasta 99 departamentos por piso y un máximo de 10000 departamentos.",
      );
      return;
    }
    setErrorEdicion(null);
    setBloqueo(null);
    reconfigurar.mutate({
      torres: valores[0],
      pisosPorTorre: valores[1],
      deptosPorPiso: valores[2],
    });
  }

  function abrirFiados(departamento: Departamento) {
    setAviso(null);
    setErrorAccion(null);
    setHoja({ tipo: "fiados", departamento });
  }

  function abrirRegistro(departamento: Departamento) {
    setAviso(null);
    setErrorAccion(null);
    setErrorRegistro(null);
    setLineas([]);
    setProductoId("");
    setCantidadTexto("1");
    setHoja({ tipo: "registrar", departamento });
  }

  function cerrarHoja(abierto: boolean) {
    if (abierto) return;
    setHoja(null);
    setAviso(null);
    setErrorAccion(null);
    setErrorRegistro(null);
  }

  function agregarLinea(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const producto = productos.data?.find((item) => item.id === Number(productoId));
    const valor = Number(cantidadTexto);
    if (!producto) {
      setErrorRegistro("Selecciona un producto.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorRegistro("La cantidad debe ser mayor que cero.");
      return;
    }
    if (producto.tipoVenta === "UNIDAD" && !Number.isInteger(valor)) {
      setErrorRegistro("Este producto se vende por unidad: usa una cantidad entera.");
      return;
    }
    setLineas((actuales) => [...actuales, { productoId: producto.id, cantidad: valor }]);
    setProductoId("");
    setCantidadTexto("1");
    setErrorRegistro(null);
  }

  function cuadros(): CuadroDatos[] {
    if (torre !== null && piso !== null) {
      return (departamentos.data ?? []).map((departamento) => ({
        clave: departamento.id,
        titulo: `Depto ${departamento.numero}`,
        subtitulo: `${departamento.fiadosPendientes} ${departamento.fiadosPendientes === 1 ? "fiado" : "fiados"}`,
        pie: departamento.conDeuda ? dinero(departamento.totalPendiente) : "Al día",
        conDeuda: departamento.conDeuda,
        etiqueta: `Ver fiados de ${departamento.etiqueta}`,
        Icono: House,
        alSeleccionar: () => abrirFiados(departamento),
      }));
    }
    if (torre !== null) {
      return (pisos.data ?? []).map((item) => ({
        clave: item.piso,
        titulo: `Piso ${item.piso}`,
        subtitulo: `${item.departamentos} departamentos`,
        pie: item.departamentosConDeuda > 0
          ? `${item.departamentosConDeuda} con deuda · ${dinero(item.totalPendiente)}`
          : "Al día",
        conDeuda: item.departamentosConDeuda > 0,
        etiqueta: `Ver piso ${item.piso} de la torre ${torre}`,
        Icono: DoorStairwell,
        alSeleccionar: () => {
          void queryClient
            .prefetchQuery({
              queryKey: ["clientes", "departamentos", torre, item.piso],
              queryFn: () => clientesApi.departamentos(torre, item.piso),
            })
            .finally(() => setPiso(item.piso));
        },
      }));
    }
    return (torres.data ?? []).map((item) => ({
      clave: item.torre,
      titulo: `Torre ${item.torre}`,
      subtitulo: `${item.departamentos} departamentos`,
      pie: item.departamentosConDeuda > 0
        ? `${item.departamentosConDeuda} con deuda · ${dinero(item.totalPendiente)}`
        : "Al día",
      conDeuda: item.departamentosConDeuda > 0,
      etiqueta: `Ver torre ${item.torre}`,
      Icono: Building,
      alSeleccionar: () => setTorre(item.torre),
    }));
  }

  if (config.isPending) {
    return <p className="py-8 text-center text-sm text-ink-soft">Cargando edificio…</p>;
  }

  if (config.error) {
    return (
      <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
        {mensajeDe(config.error, "No se pudo cargar la configuración del edificio.")}
      </p>
    );
  }

  if (!configurado) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
            Configura el edificio
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Define la cantidad de torres, pisos y departamentos. Solo se hace una vez.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Datos del edificio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviarConfiguracion} className="space-y-4">
              <div>
                <label htmlFor="config-torres" className="text-xs font-semibold text-ink">
                  Torres
                </label>
                <input
                  id="config-torres"
                  type="number"
                  min="1"
                  required
                  value={torresTexto}
                  onChange={(evento) => setTorresTexto(evento.target.value)}
                  className={cn(ESTILO_CAMPO, "mt-2")}
                />
              </div>
              <div>
                <label htmlFor="config-pisos" className="text-xs font-semibold text-ink">
                  Pisos por torre
                </label>
                <input
                  id="config-pisos"
                  type="number"
                  min="1"
                  required
                  value={pisosTexto}
                  onChange={(evento) => setPisosTexto(evento.target.value)}
                  className={cn(ESTILO_CAMPO, "mt-2")}
                />
              </div>
              <div>
                <label htmlFor="config-deptos" className="text-xs font-semibold text-ink">
                  Departamentos por piso
                </label>
                <input
                  id="config-deptos"
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={deptosTexto}
                  onChange={(evento) => setDeptosTexto(evento.target.value)}
                  className={cn(ESTILO_CAMPO, "mt-2")}
                />
              </div>
              {errorConfig && (
                <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                  {errorConfig}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={configurar.isPending}>
                {configurar.isPending ? "Configurando…" : "Configurar edificio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nivelActual = torre === null ? torres : piso === null ? pisos : departamentos;
  const items = cuadros();
  const titulo = piso !== null
    ? `Torre ${torre} · Piso ${piso}`
    : torre !== null
      ? `Torre ${torre}`
      : null;
  const totalEstimado = lineas.reduce((suma, linea) => {
    const producto = productos.data?.find((item) => item.id === linea.productoId);
    return suma + (producto ? Number(producto.precioVenta) * linea.cantidad : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {titulo && (
            <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">{titulo}</h2>
          )}
          <p className="mt-1 text-sm text-ink-soft">
            {config.data?.totalDepartamentos} departamentos.
          </p>
        </div>
        <Button type="button" aria-label="Editar sistema de torres" onClick={abrirEditor}>
          <Settings2 />
          Editar sistema de torres
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{piso !== null ? "Departamentos" : torre !== null ? "Pisos" : "Torres"}</CardTitle>
            <p className="text-sm text-ink-soft">
              Coral indica fiados pendientes; menta significa que está al día.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {torre !== null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={piso !== null ? "Volver a pisos" : "Volver a torres"}
                onClick={() => (piso !== null ? setPiso(null) : setTorre(null))}
              >
                <ArrowLeft />
                <span className="hidden md:inline">
                  {piso !== null ? "Volver a pisos" : "Volver a torres"}
                </span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Revisar fiados"
              onClick={() => {
                setAviso(null);
                setErrorAccion(null);
                setHoja({ tipo: "deudas" });
              }}
            >
              <ClipboardList />
              <span className="hidden sm:inline">Revisar fiados</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nivelActual.error && (
            <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
              {mensajeDe(nivelActual.error, "No se pudo cargar esta información.")}
            </p>
          )}
          <div className="flex min-h-[24rem] items-center justify-center rounded-field border border-line/60 bg-app/40 p-4">
            {nivelActual.isPending ? (
              <div className="flex w-full max-w-[47.5rem] flex-wrap justify-center gap-5">
                {[0, 1, 2].map((indice) => (
                  <div
                    key={indice}
                    className="aspect-square min-h-28 w-60 max-w-full rounded-card border border-line bg-surface/70"
                  />
                ))}
              </div>
            ) : items.length ? (
              <div className="flex w-full max-w-[47.5rem] flex-wrap justify-center gap-5">
                {items.map((datos) => (
                  <Cuadro key={datos.clave} datos={datos} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-ink-soft">Aún no hay datos para mostrar.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet open={hoja !== null} onOpenChange={cerrarHoja}>
        {hoja && (
          <SheetContent
            side="bottom"
            title={
              hoja.tipo === "deudas"
                ? "Revisar fiados"
                : hoja.tipo === "registrar"
                  ? "Registrar fiado"
                  : hoja.departamento.etiqueta
            }
            className="overflow-y-auto"
          >
            <div className="mb-4 pr-10">
              <h3 className="text-lg font-bold tracking-tight text-ink">
                {hoja.tipo === "deudas"
                  ? "Fiados pendientes"
                  : hoja.tipo === "registrar"
                    ? "Registrar fiado"
                    : hoja.departamento.etiqueta}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                {hoja.tipo === "deudas"
                  ? `Agrupados por ${nivel === "edificio" ? "torre" : nivel === "torre" ? "piso" : "departamento"}.`
                  : hoja.departamento.etiqueta}
              </p>
            </div>

            {aviso && (
              <p className="mb-3 rounded-field bg-success/15 px-4 py-3 text-sm text-[#3d8f83]">
                {aviso}
              </p>
            )}
            {errorAccion && (
              <p role="alert" className="mb-3 rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                {errorAccion}
              </p>
            )}

            {hoja.tipo === "fiados" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={hoja.departamento.conDeuda ? "danger" : "success"}>
                    {hoja.departamento.conDeuda ? "Con deuda" : "Al día"}
                  </Badge>
                  <span className="text-sm text-ink-soft">
                    {hoja.departamento.fiadosPendientes} pendiente(s) ·{" "}
                    {dinero(hoja.departamento.totalPendiente)}
                  </span>
                </div>
                <Button type="button" onClick={() => abrirRegistro(hoja.departamento)}>
                  <Plus />
                  Registrar fiado
                </Button>
                {fiados.error && (
                  <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                    {mensajeDe(fiados.error, "No se pudo cargar los fiados.")}
                  </p>
                )}
                {fiados.isPending ? (
                  <p className="py-6 text-center text-sm text-ink-soft">Cargando fiados…</p>
                ) : fiados.data?.length ? (
                  <ul className="divide-y divide-line/70">
                    {fiados.data.map((fiado) => (
                      <FilaFiado
                        key={fiado.id}
                        fiado={fiado}
                        pagando={pagar.isPending}
                        onPagar={() => {
                          setAviso(null);
                          setErrorAccion(null);
                          pagar.mutate(fiado.id);
                        }}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-ink-soft">
                    Aún no hay fiados para este departamento.
                  </p>
                )}
              </div>
            )}

            {hoja.tipo === "registrar" && (
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">{hoja.departamento.etiqueta}</p>
                <form onSubmit={agregarLinea} className="space-y-3">
                  <div>
                    <label htmlFor="fiado-producto" className="text-xs font-semibold text-ink">
                      Producto
                    </label>
                    <Select
                      id="fiado-producto"
                      value={productoId}
                      onChange={setProductoId}
                      className="mt-2"
                      placeholder="Selecciona un producto"
                      opciones={[
                        { valor: "", etiqueta: "Selecciona un producto" },
                        ...(productos.data ?? []).map((producto) => ({
                          valor: String(producto.id),
                          etiqueta: `${producto.nombre} · ${dinero(producto.precioVenta)} · ${cantidad(producto.stock)} ${producto.tipoVenta === "KILO" ? "kg" : "und"}`,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <label htmlFor="fiado-cantidad" className="text-xs font-semibold text-ink">
                      Cantidad
                    </label>
                    <input
                      id="fiado-cantidad"
                      type="number"
                      min="0.001"
                      step="0.001"
                      inputMode="decimal"
                      value={cantidadTexto}
                      onChange={(evento) => setCantidadTexto(evento.target.value)}
                      className={cn(ESTILO_CAMPO, "mt-2")}
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="w-full">
                    Agregar producto
                  </Button>
                </form>

                {errorRegistro && (
                  <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                    {errorRegistro}
                  </p>
                )}

                {lineas.length > 0 && (
                  <div className="space-y-3">
                    <ul className="divide-y divide-line/70 rounded-field border border-line px-4">
                      {lineas.map((linea, indice) => {
                        const producto = productos.data?.find((item) => item.id === linea.productoId);
                        return (
                          <li key={`${linea.productoId}-${indice}`} className="flex min-h-11 items-center justify-between gap-3 py-2">
                            <span className="min-w-0 flex-1 truncate text-sm text-ink">
                              {producto?.nombre ?? `Producto ${linea.productoId}`} ·{" "}
                              {cantidad(linea.cantidad)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Quitar ${producto?.nombre ?? "producto"}`}
                              onClick={() =>
                                setLineas((actuales) => actuales.filter((_, i) => i !== indice))
                              }
                              className="flex size-11 items-center justify-center rounded-xl text-[#c75f53] hover:bg-danger/10"
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-sm text-ink-soft">
                      Total estimado: <span className="font-bold text-ink">{dinero(totalEstimado)}</span>
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full"
                  disabled={lineas.length === 0 || registrar.isPending}
                  onClick={() =>
                    registrar.mutate({
                      departamentoId: hoja.departamento.id,
                      items: lineas,
                    })
                  }
                >
                  {registrar.isPending ? "Registrando…" : "Guardar fiado"}
                </Button>
              </div>
            )}

            {hoja.tipo === "deudas" && (
              <div className="space-y-4">
                {deudas.error && (
                  <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                    {mensajeDe(deudas.error, "No se pudo cargar las deudas.")}
                  </p>
                )}
                {deudas.isPending ? (
                  <p className="py-6 text-center text-sm text-ink-soft">Cargando deudas…</p>
                ) : deudas.data?.length ? (
                  <div className="space-y-4">
                    {deudas.data.map((grupo) => (
                      <section key={grupo.etiqueta} className="rounded-field border border-line p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-ink">{grupo.etiqueta}</h4>
                          <span className="text-sm font-bold text-[#c75f53]">{dinero(grupo.total)}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {grupo.cantidad} {grupo.cantidad === 1 ? "fiado pendiente" : "fiados pendientes"}
                        </p>
                        <div className="mt-3 space-y-3">
                          {grupo.departamentos.map((departamento) => (
                            <div key={departamento.departamentoId} className="border-t border-line pt-3">
                              <p className="text-xs font-semibold text-ink">
                                {departamento.etiqueta} · {dinero(departamento.total)}
                              </p>
                              <ul className="divide-y divide-line/70">
                                {departamento.fiados.map((fiado) => (
                                  <FilaFiado
                                    key={fiado.id}
                                    fiado={fiado}
                                    pagando={pagar.isPending}
                                    onPagar={() => {
                                      setAviso(null);
                                      setErrorAccion(null);
                                      pagar.mutate(fiado.id);
                                    }}
                                  />
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-ink-soft">No hay fiados pendientes.</p>
                )}
              </div>
            )}
          </SheetContent>
        )}
      </Sheet>

      <Sheet
        open={editando}
        onOpenChange={(abierto) => {
          setEditando(abierto);
          if (!abierto) {
            setErrorEdicion(null);
            setBloqueo(null);
          }
        }}
      >
        {editando && (
          <SheetContent side="center" title="Editar sistema de torres">
            <div className="mb-5 pr-10">
              <h3 className="text-lg font-bold tracking-tight text-ink">
                Editar sistema de torres
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Ajusta la cantidad de torres, pisos por torre y departamentos por piso.
              </p>
            </div>
            <form onSubmit={enviarEdicion} className="space-y-4">
              <div>
                <label htmlFor="editar-torres" className="text-xs font-semibold text-ink">
                  Torres
                </label>
                <input
                  id="editar-torres"
                  type="number"
                  min="1"
                  required
                  value={editarTorres}
                  onChange={(evento) => setEditarTorres(evento.target.value)}
                  className={cn(ESTILO_CAMPO, "mt-2")}
                />
              </div>
              <div>
                <label htmlFor="editar-pisos" className="text-xs font-semibold text-ink">
                  Pisos por torre
                </label>
                <input
                  id="editar-pisos"
                  type="number"
                  min="1"
                  required
                  value={editarPisos}
                  onChange={(evento) => setEditarPisos(evento.target.value)}
                  className={cn(ESTILO_CAMPO, "mt-2")}
                />
              </div>
              <div>
                <label htmlFor="editar-deptos" className="text-xs font-semibold text-ink">
                  Departamentos por piso
                </label>
                <input
                  id="editar-deptos"
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={editarDeptos}
                  onChange={(evento) => setEditarDeptos(evento.target.value)}
                  className={cn(ESTILO_CAMPO, "mt-2")}
                />
              </div>

              <p role="note" className="rounded-field bg-danger/10 p-4 text-xs leading-relaxed text-[#c75f53]">
                Advertencia: toda venta registrada en una torre, piso o departamento que sea
                eliminado se eliminará de la caja, del registro de ventas y de las métricas del
                dashboard. Esta acción no se puede deshacer.
              </p>

              {errorEdicion && (
                <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                  {errorEdicion}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={reconfigurar.isPending}>
                {reconfigurar.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </form>
          </SheetContent>
        )}
      </Sheet>

      {bloqueo &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4">
            <div
              role="alertdialog"
              aria-label="No se puede eliminar"
              className="w-full max-w-md rounded-3xl bg-surface p-6 text-center shadow-card"
            >
              <AlertTriangle size={32} strokeWidth={1.6} aria-hidden="true" className="mx-auto text-[#c75f53]" />
              <h3 className="mt-3 text-lg font-bold text-ink">No se puede eliminar</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Estos departamentos tienen cuentas pendientes y no se pueden quitar:
              </p>
              <p className="mt-3 rounded-field bg-danger/10 px-4 py-3 text-sm font-semibold text-[#c75f53]">
                {bloqueo}
              </p>
              <Button type="button" className="mt-5 w-full" onClick={() => setBloqueo(null)}>
                Entendido
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
