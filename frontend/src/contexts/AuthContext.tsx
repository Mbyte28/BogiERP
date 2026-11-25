import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api";
import { sesionApi, type Sesion } from "@/lib/auth";
import { EVENTO_NO_AUTORIZADO } from "@/lib/eventos";

interface AuthContextValue {
  sesion: Sesion | null;
  cargando: boolean;
  error: string | null;
  iniciarSesion: (username: string, password: string) => Promise<Sesion>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verificarSesion = useCallback(async () => {
    try {
      setSesion(await sesionApi.actual());
    } catch (fallo) {
      setSesion(null);
      if (!(fallo instanceof ApiError) || fallo.status !== 401) {
        setError("No se pudo verificar la sesión. Inténtalo de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void verificarSesion();
  }, [verificarSesion]);

  useEffect(() => {
    const alExpirar = () => {
      setSesion(null);
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
    };
    window.addEventListener(EVENTO_NO_AUTORIZADO, alExpirar);
    return () => window.removeEventListener(EVENTO_NO_AUTORIZADO, alExpirar);
  }, []);

  const iniciarSesion = useCallback(async (username: string, password: string) => {
    setError(null);
    const nuevaSesion = await sesionApi.iniciar(username, password);
    setSesion(nuevaSesion);
    return nuevaSesion;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await sesionApi.cerrar();
    } finally {
      setSesion(null);
      setError(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ sesion, cargando, error, iniciarSesion, cerrarSesion }),
    [sesion, cargando, error, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return contexto;
}
