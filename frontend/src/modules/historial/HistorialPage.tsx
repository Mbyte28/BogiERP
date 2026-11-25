import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModulo } from "@/lib/navigation";

const modulo = getModulo("HISTORIAL");

export default function HistorialPage() {
  return <ModulePlaceholder modulo={modulo} />;
}
