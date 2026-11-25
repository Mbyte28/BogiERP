import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModulo } from "@/lib/navigation";

const modulo = getModulo("CUENTAS");

export default function CuentasPage() {
  return <ModulePlaceholder modulo={modulo} />;
}
