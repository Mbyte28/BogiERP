import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  ImagePlus,
  Minus,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  cantidad,
  dinero,
  fecha,
  inventarioApi,
  urlImagen,
  type Producto,
} from "@/lib/inventario";
import { CategoriasPanel } from "./CategoriasPanel";
import { CostoForm } from "./CostoForm";
import { IconoCategoria } from "./IconoCategoria";
import { MermaForm } from "./MermaForm";
import { ProductoForm } from "./ProductoForm";

export function ProductosPanel() {
  const cliente = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [formulario, setFormulario] = useState<Producto | "nuevo" | null>(null);
  const [costoProducto, setCostoProducto] = useState<Producto | null>(null);
  const [mermaProducto, setMermaProducto] = useState<Producto | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const categorias = useQuery({ queryKey: ["categorias"], queryFn: inventarioApi.categorias });
  const productos = useQuery({
    queryKey: ["productos", busqueda, categoriaId, pagina],
    queryFn: () =>
      inventarioApi.productos({
        q: busqueda,
        categoriaId,
        page: pagina,
        size: 25,
      }),
  });

  const stock = useMutation({
    mutationFn: ({ id, valor }: { id: number; valor: number }) =>
      inventarioApi.ajustarStock(id, valor),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["productos"] });
      setMensaje(null);
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  const imagen = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) =>
      inventarioApi.subirImagen(id, archivo),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["productos"] });
      setMensaje(null);
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  const items = productos.data?.items ?? [];
  const total = productos.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / 25));

  function alBuscar(valor: string) {
    setBusqueda(valor);
    setPagina(0);
  }

  function alFiltrarCategoria(id: number | null) {
    setCategoriaId(id);
    setPagina(0);
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Productos</CardTitle>
          <p className="mt-1 text-sm text-ink-soft">
            Controla stock, costos e imágenes desde un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoriasPanel categorias={categorias.data ?? []} />
          <Button type="button" size="sm" onClick={() => setFormulario("nuevo")}>
            <Plus />
            <span className="hidden sm:inline">Nuevo producto</span>
          </Button>
        </div>
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
            onChange={(evento) => alBuscar(evento.target.value)}
            placeholder="Buscar por nombre…"
            className="h-12 w-full rounded-field border border-line bg-surface pl-11 pr-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          />
        </div>

        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
          aria-label="Filtrar por categoría"
        >
          <BotonCategoria
            activo={categoriaId === null}
            icono="package"
            label="Todos"
            onClick={() => alFiltrarCategoria(null)}
          />
          {categorias.data?.map((categoria) => (
            <BotonCategoria
              key={categoria.id}
              activo={categoriaId === categoria.id}
              icono={categoria.icono}
              label={categoria.nombre}
              onClick={() => alFiltrarCategoria(categoria.id)}
            />
          ))}
        </div>

        {mensaje && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {mensaje}
          </p>
        )}

        {categorias.error && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            No se pudieron cargar las categorías.
          </p>
        )}
        {productos.error && (
          <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
            {productos.error instanceof Error
              ? productos.error.message
              : "No se pudieron cargar los productos."}
          </p>
        )}

        {productos.isPending ? (
          <p className="py-8 text-center text-sm text-ink-soft">Cargando productos…</p>
        ) : items.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="py-3 pr-3 font-semibold">Producto</th>
                    <th className="px-3 py-3 font-semibold">Categoría</th>
                    <th className="px-3 py-3 font-semibold">Stock</th>
                    <th className="px-3 py-3 font-semibold">Precio</th>
                    <th className="px-3 py-3 font-semibold">Costo</th>
                    <th className="px-3 py-3 font-semibold">Alertas</th>
                    <th className="py-3 pl-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {items.map((producto) => (
                    <tr key={producto.id}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <Miniatura producto={producto} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{producto.nombre}</p>
                            <Badge variant="info">{producto.tipoVenta === "KILO" ? "Kilo" : "Unidad"}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{producto.categoriaNombre ?? "—"}</td>
                      <td className="px-3 py-3 font-semibold text-ink">
                        {cantidad(producto.stock)} {producto.tipoVenta === "KILO" ? "kg" : "und"}
                      </td>
                      <td className="px-3 py-3 text-ink">{dinero(producto.precioVenta)}</td>
                      <td className="px-3 py-3 text-ink">{dinero(producto.costoActual)}</td>
                      <td className="px-3 py-3">
                        <Alertas producto={producto} />
                      </td>
                      <td className="py-3 pl-3">
                        <Acciones
                          producto={producto}
                          onAjustar={(valor) => void stock.mutateAsync({ id: producto.id, valor })}
                          onCosto={() => setCostoProducto(producto)}
                          onMerma={() => setMermaProducto(producto)}
                          onEditar={() => setFormulario(producto)}
                          onImagen={(archivo) =>
                            void imagen.mutateAsync({ id: producto.id, archivo })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid gap-3 md:hidden">
              {items.map((producto) => (
                <li
                  key={producto.id}
                  className="rounded-field border border-line bg-app p-4"
                >
                  <div className="flex items-start gap-3">
                    <Miniatura producto={producto} grande />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{producto.nombre}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {producto.categoriaNombre ?? "Sin categoría"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Badge variant="info">
                          {producto.tipoVenta === "KILO" ? "Kilo" : "Unidad"}
                        </Badge>
                        <Alertas producto={producto} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-center">
                    <Dato label="Stock" valor={`${cantidad(producto.stock)} ${producto.tipoVenta === "KILO" ? "kg" : "und"}`} />
                    <Dato label="Precio" valor={dinero(producto.precioVenta)} />
                    <Dato label="Costo" valor={dinero(producto.costoActual)} />
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">
                    Vencimiento: {fecha(producto.fechaVencimiento)}
                  </p>

                  <div className="mt-3">
                    <Acciones
                      producto={producto}
                      onAjustar={(valor) => void stock.mutateAsync({ id: producto.id, valor })}
                      onCosto={() => setCostoProducto(producto)}
                      onMerma={() => setMermaProducto(producto)}
                      onEditar={() => setFormulario(producto)}
                      onImagen={(archivo) =>
                        void imagen.mutateAsync({ id: producto.id, archivo })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-sm text-ink-soft">
                {total} {total === 1 ? "producto" : "productos"}
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

      <Sheet
        open={formulario !== null}
        onOpenChange={(estado) => !estado && setFormulario(null)}
      >
        <SheetContent
          side="bottom"
          title="Producto"
          className="sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(100%,520px)] sm:rounded-l-3xl sm:rounded-t-none"
        >
          {formulario && (
            <ProductoForm
              key={formulario === "nuevo" ? "nuevo" : formulario.id}
              producto={formulario === "nuevo" ? null : formulario}
              categorias={categorias.data ?? []}
              onGuardado={() => setFormulario(null)}
              onCancelar={() => setFormulario(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={costoProducto !== null} onOpenChange={(estado) => !estado && setCostoProducto(null)}>
        <SheetContent
          side="bottom"
          title="Costo del producto"
          className="sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(100%,440px)] sm:rounded-l-3xl sm:rounded-t-none"
        >
          {costoProducto && (
            <CostoForm
              key={costoProducto.id}
              producto={costoProducto}
              onGuardado={() => setCostoProducto(null)}
              onCancelar={() => setCostoProducto(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={mermaProducto !== null} onOpenChange={(estado) => !estado && setMermaProducto(null)}>
        <SheetContent
          side="bottom"
          title="Registrar merma"
          className="sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(100%,480px)] sm:rounded-l-3xl sm:rounded-t-none"
        >
          {mermaProducto && (
            <MermaForm
              key={mermaProducto.id}
              productos={items}
              productoIdInicial={mermaProducto.id}
              onGuardado={() => setMermaProducto(null)}
              onCancelar={() => setMermaProducto(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function BotonCategoria({
  activo,
  icono,
  label,
  onClick,
}: {
  activo: boolean;
  icono: string | null;
  label: string;
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
      {label}
    </button>
  );
}

function Miniatura({ producto, grande = false }: { producto: Producto; grande?: boolean }) {
  const fuente = urlImagen(producto.imagen);
  const [fallo, setFallo] = useState(false);
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-app text-primary-600 ${
        grande ? "size-14" : "size-10"
      }`}
    >
      {fuente && !fallo ? (
        <img
          src={fuente}
          alt=""
          className="size-full object-cover"
          onError={() => setFallo(true)}
        />
      ) : (
        <IconoCategoria nombre={producto.categoriaIcono} size={grande ? 22 : 18} />
      )}
    </span>
  );
}

function Alertas({ producto }: { producto: Producto }) {
  const dias = producto.diasVencimiento;
  return (
    <>
      {producto.sinCosto && <Badge variant="warning">Sin costo</Badge>}
      {dias !== null && dias < 0 && <Badge variant="danger">Vencido</Badge>}
      {dias !== null && dias === 0 && <Badge variant="warning">Vence hoy</Badge>}
      {dias !== null && dias > 0 && dias <= 7 && (
        <Badge variant="warning">Vence en {dias} d</Badge>
      )}
    </>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase text-ink-soft">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-ink">{valor}</p>
    </div>
  );
}

function Acciones({
  producto,
  onAjustar,
  onCosto,
  onMerma,
  onEditar,
  onImagen,
}: {
  producto: Producto;
  onAjustar: (valor: number) => void;
  onCosto: () => void;
  onMerma: () => void;
  onEditar: () => void;
  onImagen: (archivo: File) => void;
}) {
  const nombre = producto.nombre;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Quitar stock de ${nombre}`}
        onClick={() => onAjustar(-1)}
      >
        <Minus />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={`Agregar stock a ${nombre}`}
        onClick={() => onAjustar(1)}
      >
        <Plus />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Editar costo de ${nombre}`}
        onClick={onCosto}
      >
        <CircleDollarSign />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Registrar merma de ${nombre}`}
        onClick={onMerma}
      >
        <ClipboardList />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Editar ${nombre}`}
        onClick={onEditar}
      >
        <Pencil />
      </Button>
      <label
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-soft outline-none transition-colors hover:bg-app hover:text-ink focus-within:ring-2 focus-within:ring-primary-500/40"
        aria-label={`Cambiar imagen de ${nombre}`}
      >
        <ImagePlus />
        <span className="sr-only">Cambiar imagen de {nombre}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            if (archivo) onImagen(archivo);
            evento.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
