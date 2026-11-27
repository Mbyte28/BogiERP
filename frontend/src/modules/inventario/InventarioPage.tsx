import { MermasPanel } from "./MermasPanel";
import { ProductosPanel } from "./ProductosPanel";

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <ProductosPanel />
      <MermasPanel />
    </div>
  );
}
