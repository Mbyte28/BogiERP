import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModulo } from "@/lib/navigation";

const modulo = getModulo("CLIENTES");

export default function ClientesPage() {
  return <ModulePlaceholder modulo={modulo} />;
}
