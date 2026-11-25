import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  inventarioApi,
  type Categoria,
  type DatosProducto,
  type Producto,
  type TipoVenta,
} from "@/lib/inventario";

export function ProductoForm({
  producto,
  categorias,
  onGuardado,
  onCancelar,
}: {
  producto?: Producto | null;
  categorias: Categoria[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const cliente = useQueryClient();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(
    producto?.categoriaId === null || producto?.categoriaId === undefined
      ? ""
      : String(producto.categoriaId),
  );
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>(producto?.tipoVenta ?? "UNIDAD");
  const [precioVenta, setPrecioVenta] = useState(producto?.precioVenta ?? "");
  const [costoActual, setCostoActual] = useState(producto?.costoActual ?? "");
  const [stock, setStock] = useState(producto?.stock ?? "0");
  const [fechaVencimiento, setFechaVencimiento] = useState(producto?.fechaVencimiento ?? "");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async (datos: DatosProducto) =>
      producto
        ? inventarioApi.actualizarProducto(producto.id, datos)
        : inventarioApi.crearProducto(datos),
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["productos"] }),
        cliente.invalidateQueries({ queryKey: ["categorias"] }),
      ]);
      onGuardado();
    },
    onError: (fallo: Error) => setMensaje(fallo.message),
  });

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    await guardar.mutateAsync({
      nombre: nombre.trim(),
      categoriaId: categoriaId ? Number(categoriaId) : null,
      tipoVenta,
      precioVenta: Number(precioVenta),
      costoActual: costoActual === "" ? null : Number(costoActual),
      stock: stock === "" ? 0 : Number(stock),
      fechaVencimiento: fechaVencimiento || null,
    });
  }

  return (
    <form onSubmit={alEnviar} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {producto ? "Editar producto" : "Nuevo producto"}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Los precios están en soles. El costo es opcional y se puede registrar después.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="producto-nombre" label="Nombre" className="sm:col-span-2">
          <input
            id="producto-nombre"
            required
            maxLength={150}
            autoComplete="off"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="Ej. Cerveza lata 355 ml"
          />
        </Campo>

        <Campo id="producto-categoria" label="Categoría">
          <select
            id="producto-categoria"
            value={categoriaId}
            onChange={(evento) => setCategoriaId(evento.target.value)}
            className={ESTILO_CAMPO}
          >
            <option value="">Sin categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="producto-tipo" label="Tipo de venta">
          <select
            id="producto-tipo"
            value={tipoVenta}
            onChange={(evento) => setTipoVenta(evento.target.value as TipoVenta)}
            className={ESTILO_CAMPO}
          >
            <option value="UNIDAD">Unidad</option>
            <option value="KILO">Kilo</option>
          </select>
        </Campo>

        <Campo id="producto-precio" label="Precio de venta">
          <input
            id="producto-precio"
            type="number"
            required
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={precioVenta}
            onChange={(evento) => setPrecioVenta(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="0.00"
          />
        </Campo>

        <Campo id="producto-costo" label="Costo actual (opcional)">
          <input
            id="producto-costo"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={costoActual}
            onChange={(evento) => setCostoActual(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="Sin costo"
          />
        </Campo>

        <Campo id="producto-stock" label={tipoVenta === "KILO" ? "Stock (kilos)" : "Stock (unidades)"}>
          <input
            id="producto-stock"
            type="number"
            required
            min="0"
            step={tipoVenta === "KILO" ? "0.001" : "1"}
            inputMode="decimal"
            value={stock}
            onChange={(evento) => setStock(evento.target.value)}
            className={ESTILO_CAMPO}
            placeholder="0"
          />
        </Campo>

        <Campo id="producto-vence" label="Fecha de vencimiento (opcional)">
          <input
            id="producto-vence"
            type="date"
            value={fechaVencimiento}
            onChange={(evento) => setFechaVencimiento(evento.target.value)}
            className={ESTILO_CAMPO}
          />
        </Campo>
      </div>

      {mensaje && (
        <p role="alert" className="rounded-field bg-danger/15 px-4 py-3 text-sm text-[#c75f53]">
          {mensaje}
        </p>
      )}

      <div className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={guardar.isPending}>
          {guardar.isPending
            ? "Guardando…"
            : producto
              ? "Guardar cambios"
              : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}

export const ESTILO_CAMPO =
  "h-12 w-full rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";

export function Campo({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
