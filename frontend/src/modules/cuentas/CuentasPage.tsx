import { RolesPanel } from "./RolesPanel";
import { UsuariosPanel } from "./UsuariosPanel";

export default function CuentasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
          Control de acceso
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Gestiona usuarios, roles y los módulos permitidos para cada rol.
        </p>
      </div>

      <UsuariosPanel />
      <RolesPanel />
    </div>
  );
}
