import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModulo } from "@/lib/navigation";

const modulo = getModulo("INVENTARIO");

export default function InventarioPage() {
  return <ModulePlaceholder modulo={modulo} />;
}
