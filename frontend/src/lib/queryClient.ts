import { QueryClient } from "@tanstack/react-query";

/** Refresco global para todo el sistema; las vistas operativas usan uno más rápido. */
export const REFRESCO_AUTOMATICO = 10_000;
export const REFRESCO_RAPIDO = 5_000;

export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: REFRESCO_AUTOMATICO,
        refetchIntervalInBackground: false,
      },
    },
  });
}
