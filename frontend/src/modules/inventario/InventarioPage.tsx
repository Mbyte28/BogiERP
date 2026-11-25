import { MermasPanel } from "./MermasPanel";
import { ProductosPanel } from "./ProductosPanel";

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Inventario</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Categorías, productos, stock, costos, imágenes y mermas de la tienda.
        </p>
      </div>

      <ProductosPanel />
      <MermasPanel />
    </div>
  );
}
