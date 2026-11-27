import { useRef, useState, type ChangeEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import {
  cantidad,
  dinero,
  fecha,
  inventarioApi,
  urlImagen,
  type Producto,
} from "@/lib/inventario";
import { REFRESCO_RAPIDO } from "@/lib/queryClient";
import { CategoriasPanel } from "./CategoriasPanel";
import { IconoCategoria } from "./IconoCategoria";
import { MermaForm } from "./MermaForm";
import { ProductoForm } from "./ProductoForm";
import { RegistrarInventarioSheet } from "./RegistrarInventarioSheet";

export function ProductosPanel() {
  const cliente = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [formulario, setFormulario] = useState<Producto | "nuevo" | null>(null);
  const [mermaProducto, setMermaProducto] = useState<Producto | null>(null);
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [productoImagen, setProductoImagen] = useState<Producto | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const entradaImagen = useRef<HTMLInputElement>(null);
  const idImagenPendiente = useRef<number | null>(null);

  const categorias = useQuery({
    queryKey: ["categorias"],
    queryFn: inventarioApi.categorias,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const productos = useQuery({
    queryKey: ["productos", busqueda, categoriaId, pagina],
    queryFn: () =>
      inventarioApi.productos({
        q: busqueda,
        categoriaId,
        page: pagina,
        size: 25,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESCO_RAPIDO,
  });

  const imagen = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) =>
      inventarioApi.subirImagen(id, archivo),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["productos"] });
      setProductoImagen(null);
      setMensaje(null);
    },
    onError: async (fallo: Error) => {
      setMensaje(fallo.message);
      if (fallo instanceof ApiError && (fallo.status === 404 || fallo.status === 409)) {
        await cliente.invalidateQueries({ queryKey: ["productos"] });
      }
    },
  });

  const borrarImagen = useMutation({
    mutationFn: (id: number) => inventarioApi.eliminarImagen(id),
    onSuccess: async (actualizado) => {
      setProductoImagen(actualizado);
      setMensaje(null);
      await cliente.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: async (fallo: Error) => {
      setMensaje(fallo.message);
      if (fallo instanceof ApiError && (fallo.status === 404 || fallo.status === 409)) {
        await cliente.invalidateQueries({ queryKey: ["productos"] });
      }
    },
  });

  const items = productos.data?.items ?? [];
  const total = productos.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / 25));

  function alBuscar(valor: string) {
    setBusqueda(valor);
    if (valor.trim()) setCategoriaId(null);
    setPagina(0);
  }

  function alFiltrarCategoria(id: number | null) {
    setCategoriaId(id);
    setBusqueda("");
    setPagina(0);
  }

  function abrirSelectorImagen(id: number) {
    idImagenPendiente.current = id;
    entradaImagen.current?.click();
  }

  function alAccionarImagen(producto: Producto) {
    setMensaje(null);
    if (producto.imagen) {
      setProductoImagen(producto);
    } else {
      abrirSelectorImagen(producto.id);
    }
  }

  function alCambiarImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    const id = idImagenPendiente.current;
    evento.target.value = "";
    if (!archivo || id === null) return;
    void imagen.mutateAsync({ id, archivo });
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Productos</CardTitle>
          <p className="mt-1 text-sm text-ink-soft">
            Controla stock, imágenes y mermas desde un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoriasPanel categorias={categorias.data ?? []} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Registrar inventario"
            onClick={() => setRegistroAbierto(true)}
          >
            <Plus />
            <span className="hidden sm:inline">Registrar inventario</span>
          </Button>
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

        {productos.isPending && <p role="status" className="sr-only">Cargando productos…</p>}
        {productos.isPlaceholderData && (
          <p role="status" className="sr-only">Actualizando productos…</p>
        )}

        {productos.isPending ? (
          <div className="min-h-[22rem]" aria-hidden="true">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, indice) => (
                <div
                  key={indice}
                  className="h-28 animate-pulse rounded-field border border-line bg-app"
                />
              ))}
            </div>
          </div>
        ) : items.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[808px] table-fixed border-collapse text-center text-sm">
                <colgroup>
                  <col style={{ width: "14.5rem" }} />
                  <col style={{ width: "7rem" }} />
                  <col style={{ width: "6rem" }} />
                  <col style={{ width: "6rem" }} />
                  <col style={{ width: "7rem" }} />
                  <col style={{ width: "10rem" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                    <th className="py-3 pl-3 pr-2 text-left font-semibold">Producto</th>
                    <th className="px-3 py-3 font-semibold">Categoría</th>
                    <th className="px-3 py-3 font-semibold">Stock</th>
                    <th className="px-3 py-3 font-semibold">Precio</th>
                    <th className="px-3 py-3 font-semibold">Alertas</th>
                    <th className="py-3 pl-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {items.map((producto) => (
                    <tr key={producto.id}>
                      <td className="py-3 pl-3 pr-2">
                        <div className="flex items-center justify-start gap-3 text-left">
                          <Miniatura producto={producto} />
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate font-semibold text-ink" title={producto.nombre}>
                              {producto.nombre}
                            </p>
                            <Badge variant="info">{producto.tipoVenta === "KILO" ? "Kilo" : "Unidad"}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{producto.categoriaNombre ?? "—"}</td>
                      <td className="px-3 py-3 font-semibold text-ink">
                        {cantidad(producto.stock)} {producto.tipoVenta === "KILO" ? "kg" : "uni"}
                      </td>
                      <td className="px-3 py-3 text-ink">{dinero(producto.precioVenta)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-center gap-1">
                          <Alertas producto={producto} />
                        </div>
                      </td>
                      <td className="py-3 pl-3">
                        <Acciones
                          producto={producto}
                          onMerma={() => setMermaProducto(producto)}
                          onEditar={() => setFormulario(producto)}
                          onImagen={() => alAccionarImagen(producto)}
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

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 text-center">
                    <Dato label="Stock" valor={`${cantidad(producto.stock)} ${producto.tipoVenta === "KILO" ? "kg" : "uni"}`} />
                    <Dato label="Precio" valor={dinero(producto.precioVenta)} />
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">
                    Vencimiento: {fecha(producto.fechaVencimiento)}
                  </p>

                  <div className="mt-3">
                    <Acciones
                      producto={producto}
                      onMerma={() => setMermaProducto(producto)}
                      onEditar={() => setFormulario(producto)}
                      onImagen={() => alAccionarImagen(producto)}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-ink-soft">
                  {total} {total === 1 ? "producto" : "productos"}
                </p>
                {productos.isPlaceholderData && (
                  <LoaderCircle
                    size={14}
                    aria-hidden="true"
                    className="animate-spin text-primary-600"
                  />
                )}
              </div>
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

      <RegistrarInventarioSheet
        abierto={registroAbierto}
        onCerrar={() => setRegistroAbierto(false)}
      />

      <Sheet
        open={productoImagen !== null}
        onOpenChange={(estado) => {
          if (!estado) {
            setProductoImagen(null);
            setMensaje(null);
          }
        }}
      >
        <SheetContent
          side="center"
          title={productoImagen ? `Imagen de ${productoImagen.nombre}` : "Imagen del producto"}
          className="w-[min(96vw,520px)] gap-4"
        >
          {productoImagen && (
            <>
              <div className="pr-12">
                <h3 className="text-lg font-bold text-ink">
                  Imagen de {productoImagen.nombre}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {productoImagen.imagen
                    ? "Elimina la imagen actual para poder subir otra."
                    : "Este producto no tiene imagen registrada."}
                </p>
              </div>

              {productoImagen.imagen ? (
                <ImagenGrande nombre={productoImagen.nombre} archivo={productoImagen.imagen} />
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-app p-5 text-center">
                  <ImageIcon size={32} className="text-ink-soft" />
                  <p className="text-sm text-ink-soft">Este producto no tiene imagen.</p>
                </div>
              )}

              {mensaje && (
                <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
                  {mensaje}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    setProductoImagen(null);
                    setMensaje(null);
                  }}
                >
                  Cancelar
                </Button>
                {productoImagen.imagen ? (
                  <Button
                    type="button"
                    className="h-12"
                    disabled={borrarImagen.isPending}
                    onClick={() => void borrarImagen.mutateAsync(productoImagen.id)}
                  >
                    {borrarImagen.isPending ? "Eliminando…" : "Eliminar imagen"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-12"
                    disabled={imagen.isPending}
                    onClick={() => abrirSelectorImagen(productoImagen.id)}
                  >
                    Agregar imagen
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <input
        ref={entradaImagen}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Seleccionar imagen del producto"
        className="sr-only"
        onChange={alCambiarImagen}
      />
    </Card>
  );
}

function ImagenGrande({ nombre, archivo }: { nombre: string; archivo: string }) {
  const [fallo, setFallo] = useState(false);
  const fuente = urlImagen(archivo);
  return (
    <div className="flex max-h-[45dvh] min-h-40 items-center justify-center overflow-hidden rounded-xl bg-app">
      {fuente && !fallo ? (
        <img
          src={fuente}
          alt={`Imagen de ${nombre}`}
          className="max-h-[45dvh] w-full object-contain"
          onError={() => setFallo(true)}
        />
      ) : (
        <p className="p-5 text-sm text-ink-soft">No se pudo mostrar la imagen.</p>
      )}
    </div>
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
  onMerma,
  onEditar,
  onImagen,
}: {
  producto: Producto;
  onMerma: () => void;
  onEditar: () => void;
  onImagen: () => void;
}) {
  const nombre = producto.nombre;
  return (
    <div className="flex flex-wrap justify-center gap-2">
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={producto.imagen ? `Ver imagen de ${nombre}` : `Agregar imagen de ${nombre}`}
        onClick={onImagen}
      >
        {producto.imagen ? <ImageIcon /> : <ImagePlus />}
      </Button>
    </div>
  );
}
