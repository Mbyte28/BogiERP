import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { getModulo } from "@/lib/navigation";

const modulo = getModulo("DASHBOARD");

export default function DashboardPage() {
  return <ModulePlaceholder modulo={modulo} />;
}
