import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModulo } from "@/lib/navigation";

const modulo = getModulo("VENTA");

export default function VentaPage() {
  return <ModulePlaceholder modulo={modulo} />;
}
