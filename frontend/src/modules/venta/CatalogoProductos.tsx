import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cantidad, dinero, inventarioApi, urlImagen } from "@/lib/inventario";
import { REFRESCO_RAPIDO } from "@/lib/queryClient";
import { ventaApi, type ItemCatalogo } from "@/lib/venta";
import { IconoCategoria } from "@/modules/inventario/IconoCategoria";

const TAMANO = 25;

function unidad(producto: ItemCatalogo): string {
  return producto.tipoVenta === "KILO" ? "kg" : "uni";
}

export function CatalogoProductos({
  onSeleccionar,
  textoBoton = "Agregar",
  deshabilitarSinStock = true,
  seleccionadosIds = [],
}: {
  onSeleccionar: (producto: ItemCatalogo) => void;
  textoBoton?: string;
  deshabilitarSinStock?: boolean;
  seleccionadosIds?: number[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);

  const categorias = useQuery({
    queryKey: ["categorias"],
    queryFn: inventarioApi.categorias,
    refetchInterval: REFRESCO_RAPIDO,
  });
  const catalogo = useQuery({
    queryKey: ["catalogo", busqueda, categoriaId, pagina],
    queryFn: () =>
      ventaApi.catalogo({ q: busqueda, categoriaId, page: pagina, size: TAMANO }),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESCO_RAPIDO,
  });

  const items = catalogo.data?.items ?? [];
  const totalItems = catalogo.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / TAMANO));

  return (
    <div className="space-y-5">
      {busqueda.trim() && (
        <p className="text-sm text-ink-soft">Buscando en todas las categorías.</p>
      )}

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
            if (evento.target.value.trim()) setCategoriaId(null);
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
              setBusqueda("");
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

      {catalogo.isPending && <p role="status" className="sr-only">Cargando productos…</p>}
      {catalogo.isPlaceholderData && (
        <p role="status" className="sr-only">Actualizando productos…</p>
      )}

      <div className="min-h-[22rem]">
        {catalogo.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, indice) => (
              <div
                key={indice}
                className="h-[210px] animate-pulse rounded-field border border-line bg-app"
              />
            ))}
          </div>
        ) : items.length ? (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((producto) => (
                <TarjetaProducto
                  key={producto.id}
                  producto={producto}
                  textoBoton={textoBoton}
                  sinStock={deshabilitarSinStock && Number(producto.stock) <= 0}
                  seleccionado={seleccionadosIds.includes(producto.id)}
                  onSeleccionar={() => onSeleccionar(producto)}
                />
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-ink-soft">
                  {totalItems} {totalItems === 1 ? "producto" : "productos"}
                </p>
                {catalogo.isPlaceholderData && (
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
      </div>
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
  textoBoton,
  sinStock,
  seleccionado,
  onSeleccionar,
}: {
  producto: ItemCatalogo;
  textoBoton: string;
  sinStock: boolean;
  seleccionado: boolean;
  onSeleccionar: () => void;
}) {
  const fuente = urlImagen(producto.imagen);
  return (
    <li
      className={`flex h-full min-h-[210px] min-w-0 flex-col rounded-field border bg-app p-3 ${
        seleccionado ? "border-primary-500 ring-2 ring-primary-500/30" : "border-line"
      }`}
    >
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
      <div className="mt-3 flex min-h-12 flex-wrap content-start items-start gap-1">
        <Badge variant="info">
          {producto.tipoVenta === "KILO" ? "Kilo" : "Unidad"}
        </Badge>
        {producto.masVendido && <Badge variant="default">Más vendido</Badge>}
        {producto.sinCosto && <Badge variant="warning">Sin costo</Badge>}
      </div>
      <p className="mt-2 min-h-4 text-xs text-ink-soft">
        Stock: {cantidad(producto.stock)} {unidad(producto)} · Vendido:{" "}
        {cantidad(producto.cantidadVendida)} {unidad(producto)}
      </p>
      <div className="mt-auto pt-3">
        <Button
          type="button"
          size="sm"
          className="w-full"
          variant={seleccionado ? "secondary" : "default"}
          disabled={sinStock || seleccionado}
          aria-label={`${textoBoton} ${producto.nombre}`}
          onClick={onSeleccionar}
        >
          {seleccionado ? <Check /> : <Plus />}
          {sinStock ? "Sin stock" : seleccionado ? "Seleccionado" : textoBoton}
        </Button>
      </div>
    </li>
  );
}
