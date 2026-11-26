import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  dashboardApi,
  finDeMes,
  inicioDeMes,
  type PeriodoDashboard,
  type ProductoDestacado,
  type VentaMensual,
} from "@/lib/dashboard";
import { cantidad, dinero, urlImagen } from "@/lib/inventario";
import { cn } from "@/lib/utils";
import { IconoCategoria } from "@/modules/inventario/IconoCategoria";

const COLORES = ["#ac59db", "#6ecaba", "#e9b974", "#f08b7f", "#3182c4"];
const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const ANIO_ACTUAL = new Date().getFullYear();

function parsearPeriodo(valor: string): { periodo: PeriodoDashboard; cantidad: number } {
  const [periodo, numero] = valor.split(":");
  return { periodo: periodo as PeriodoDashboard, cantidad: Number(numero) };
}

function etiquetaMes(mes: string): string {
  const [anio, numero] = mes.split("-");
  return `${MESES[Number(numero) - 1] ?? numero} ${anio.slice(2)}`;
}

function etiquetaMesCompleta(mes: string): string {
  const [anio, numero] = mes.split("-");
  return `${MESES[Number(numero) - 1] ?? numero} de ${anio}`;
}

function mensajeDe(error: unknown, respaldo: string): string {
  return error instanceof Error ? error.message : respaldo;
}

function numero(valor: unknown): number {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatoEje(valor: number): string {
  return new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(
    valor,
  );
}

function formatoTooltip(valor: unknown): string {
  return dinero(Array.isArray(valor) ? valor[0] : valor);
}

function Sparkline({ valores, color }: { valores: unknown[]; color: string }) {
  const datos = valores.map((valor, indice) => ({ indice, valor: numero(valor) }));
  if (!datos.length) return <div className="h-10 w-20 shrink-0" aria-hidden="true" />;
  return (
    <div className="h-10 w-20 shrink-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 3, right: 0, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey="valor"
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  nota,
  color,
  serie,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  color: string;
  serie: unknown[];
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex items-center justify-between gap-2 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{etiqueta}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {valor}
          </p>
          <p className="mt-1 truncate text-xs text-ink-soft">{nota}</p>
        </div>
        <Sparkline valores={serie} color={color} />
      </CardContent>
    </Card>
  );
}

function Miniatura({ producto }: { producto: ProductoDestacado }) {
  const url = urlImagen(producto.imagen);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-11 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
      <IconoCategoria nombre={producto.categoriaIcono} size={20} />
    </div>
  );
}

function FilaProducto({ producto }: { producto: ProductoDestacado }) {
  const unidad = producto.tipoVenta === "KILO" ? "kg" : "und";
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <Miniatura producto={producto} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{producto.nombre}</p>
        <p className="text-xs text-ink-soft">
          {cantidad(producto.cantidad)} {unidad} · {dinero(producto.ventas)}
        </p>
      </div>
      <span className="shrink-0 text-sm font-bold text-primary-600">
        {dinero(producto.ganancia)}
      </span>
    </li>
  );
}

export default function DashboardPage() {
  const [opcion, setOpcion] = useState("meses:6");
  const [mesSeleccionado, setMesSeleccionado] = useState<string | null>(null);
  const { periodo, cantidad: valorPeriodo } = parsearPeriodo(opcion);

  const mensuales = useQuery({
    queryKey: ["dashboard", "mensuales", periodo, valorPeriodo],
    queryFn: () => dashboardApi.ventasMensuales(periodo, valorPeriodo),
  });
  const serie = mensuales.data ?? [];
  const ultimoMes = serie.at(-1)?.mes ?? null;
  const mesActivo = mesSeleccionado || ultimoMes;
  const desde = serie[0] ? inicioDeMes(serie[0].mes) : undefined;
  const hasta = ultimoMes ? finDeMes(ultimoMes) : undefined;

  const resumen = useQuery({
    queryKey: ["dashboard", "resumen", desde, hasta],
    queryFn: () => dashboardApi.resumen(desde, hasta),
    enabled: desde !== undefined && hasta !== undefined,
  });
  const detalle = useQuery({
    queryKey: ["dashboard", "mes", mesActivo],
    queryFn: () => dashboardApi.mes(mesActivo as string),
    enabled: Boolean(mesActivo),
  });
  const menosVendidos = useQuery({
    queryKey: ["dashboard", "top", mesActivo, "asc"],
    queryFn: () =>
      dashboardApi.topProductos(inicioDeMes(mesActivo as string), finDeMes(mesActivo as string), "asc"),
    enabled: Boolean(mesActivo),
  });

  const resumenMes = detalle.data?.resumen;
  const masVendidos = (detalle.data?.topProductos ?? []).slice(0, 3);
  const menos = (menosVendidos.data ?? []).slice(0, 3);
  const porDia = detalle.data?.porDia ?? [];
  const dona = (detalle.data?.topProductos ?? []).slice(0, 5).map((producto, indice) => ({
    ...producto,
    valor: numero(producto.cantidad),
    color: COLORES[indice % COLORES.length],
  }));

  const error =
    mensuales.error ?? resumen.error ?? detalle.error ?? menosVendidos.error ?? null;

  function seleccionarMes(mes: string | undefined) {
    if (mes) setMesSeleccionado(mes);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Dashboard</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ventas, ganancia, merma y productos destacados de la tienda. Se actualiza automáticamente.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Select
            ariaLabel="Periodo"
            className="w-full sm:w-44"
            value={opcion}
            onChange={(valor) => {
              setOpcion(valor);
              setMesSeleccionado(null);
            }}
            opciones={[
              { valor: "meses:6", etiqueta: "Últimos 6 meses" },
              { valor: "meses:12", etiqueta: "Últimos 12 meses" },
              { valor: `anio:${ANIO_ACTUAL}`, etiqueta: `Año ${ANIO_ACTUAL}` },
            ]}
          />
          <Select
            ariaLabel="Mes"
            className="w-full sm:w-44"
            value={mesActivo ?? ""}
            disabled={!serie.length}
            onChange={setMesSeleccionado}
            placeholder="Selecciona un mes"
            opciones={serie.map((punto) => ({
              valor: punto.mes,
              etiqueta: etiquetaMesCompleta(punto.mes),
            }))}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {mensajeDe(error, "No se pudo cargar el dashboard.")}
        </p>
      )}

      {mensuales.isPending ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-ink-soft">
            Cargando dashboard…
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              etiqueta="Ventas del mes"
              valor={dinero(resumenMes?.ventas)}
              nota="Total facturado"
              color="#ac59db"
              serie={serie.map((punto) => punto.ventas)}
            />
            <Kpi
              etiqueta="Ganancia neta"
              valor={dinero(resumenMes?.gananciaNeta)}
              nota={`Bruta ${dinero(resumenMes?.ganancia)}`}
              color="#34d396"
              serie={serie.map((punto) => punto.gananciaNeta)}
            />
            <Kpi
              etiqueta="Vendido"
              valor={`${cantidad(resumenMes?.unidades)} und`}
              nota={`${cantidad(resumenMes?.kilos)} kg vendidos`}
              color="#3182c4"
              serie={serie.map((punto) => punto.unidades)}
            />
            <Kpi
              etiqueta="Merma"
              valor={dinero(resumenMes?.merma)}
              nota={`${resumenMes?.itemsSinCosto ?? 0} ítems sin costo`}
              color="#f08b7f"
              serie={serie.map((punto) => punto.merma)}
            />
          </div>

          <p className="text-xs text-ink-soft">
            Acumulado del periodo ({resumen.data?.desde ?? desde} al{" "}
            {resumen.data?.hasta ?? hasta}): <strong>{dinero(resumen.data?.ventas)}</strong> en
            ventas y <strong>{dinero(resumen.data?.gananciaNeta)}</strong> de ganancia neta.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ventas mensuales</CardTitle>
                <p className="text-sm text-ink-soft">
                  Evolución de las ventas y la ganancia neta en el periodo elegido.
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={serie} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e6eb" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tickFormatter={etiquetaMes}
                        tick={{ fontSize: 11, fill: "#7a8190" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        width={48}
                        tickFormatter={formatoEje}
                        tick={{ fontSize: 11, fill: "#7a8190" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={formatoTooltip}
                        labelFormatter={(valor) => etiquetaMes(String(valor))}
                      />
                      <Area
                        type="monotone"
                        dataKey="ventas"
                        name="Ventas"
                        stroke="#ac59db"
                        fill="#ac59db"
                        fillOpacity={0.18}
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="gananciaNeta"
                        name="Ganancia neta"
                        stroke="#34d396"
                        fill="#34d396"
                        fillOpacity={0.12}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos más vendidos</CardTitle>
                <p className="text-sm text-ink-soft">Distribución por cantidad del mes.</p>
              </CardHeader>
              <CardContent>
                {dona.length ? (
                  <>
                    <div className="relative h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dona}
                            dataKey="valor"
                            nameKey="nombre"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={3}
                            isAnimationActive={false}
                          >
                            {dona.map((producto) => (
                              <Cell key={producto.productoId} fill={producto.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(valor) =>
                              `${cantidad(numero(valor))} ${formatoTooltip(valor)}`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-semibold uppercase text-ink-soft">
                          Top {dona.length}
                        </span>
                        <span className="text-lg font-bold text-ink">
                          {cantidad(dona.reduce((total, producto) => total + producto.valor, 0))}
                        </span>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {dona.map((producto) => (
                        <li key={producto.productoId} className="flex items-center gap-2 text-xs">
                          <span
                            aria-hidden="true"
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: producto.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-ink-soft">
                            {producto.nombre}
                          </span>
                          <span className="font-bold text-ink">{cantidad(producto.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-ink-soft">
                    Sin productos vendidos en este mes.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ventas por mes</CardTitle>
              <p className="text-sm text-ink-soft">
                Toca una barra para ver el detalle de ese mes.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e6eb" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tickFormatter={etiquetaMes}
                      tick={{ fontSize: 11, fill: "#7a8190" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={48}
                      tickFormatter={formatoEje}
                      tick={{ fontSize: 11, fill: "#7a8190" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={formatoTooltip} labelFormatter={(valor) => etiquetaMes(String(valor))} />
                    <Bar
                      dataKey="ventas"
                      name="Ventas"
                      radius={[10, 10, 0, 0]}
                      cursor="pointer"
                      isAnimationActive={false}
                      onClick={(dato: unknown) => {
                        const fila = dato as { payload?: VentaMensual } | null;
                        seleccionarMes(fila?.payload?.mes);
                      }}
                    >
                      {serie.map((punto) => (
                        <Cell
                          key={punto.mes}
                          fill={punto.mes === mesActivo ? "#8e3fbf" : "#d9bce9"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {mesActivo ? `Detalle de ${etiquetaMesCompleta(mesActivo)}` : "Detalle del mes"}
                </CardTitle>
                <p className="text-sm text-ink-soft">Ventas, ganancia y merma por día.</p>
              </CardHeader>
              <CardContent>
                {detalle.isPending ? (
                  <p className="py-12 text-center text-sm text-ink-soft">Cargando detalle…</p>
                ) : porDia.length ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={porDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#e2e6eb" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="dia"
                          tickFormatter={(valor: string) => valor.slice(8)}
                          tick={{ fontSize: 11, fill: "#7a8190" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          width={44}
                          tickFormatter={formatoEje}
                          tick={{ fontSize: 11, fill: "#7a8190" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip formatter={formatoTooltip} />
                        <Line
                          type="monotone"
                          dataKey="ventas"
                          name="Ventas"
                          stroke="#ac59db"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="ganancia"
                          name="Ganancia"
                          stroke="#34d396"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="merma"
                          name="Merma"
                          stroke="#f08b7f"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-ink-soft">
                    Sin movimientos en este mes.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle>Más vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {masVendidos.length ? (
                    <ul className="divide-y divide-line/70">
                      {masVendidos.map((producto) => (
                        <FilaProducto key={producto.productoId} producto={producto} />
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-sm text-ink-soft">Sin ventas este mes.</p>
                  )}
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle>Menos vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {menos.length ? (
                    <ul className="divide-y divide-line/70">
                      {menos.map((producto) => (
                        <FilaProducto key={producto.productoId} producto={producto} />
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-sm text-ink-soft">
                      No hay productos activos.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <p className={cn("text-xs text-ink-soft")}>
            Las cifras usan los precios y costos guardados al momento de cada venta o envío.
          </p>
        </>
      )}
    </div>
  );
}
