import { EVENTO_NO_AUTORIZADO } from "./eventos";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly detalle: unknown;

  constructor(status: number, mensaje: string, detalle?: unknown) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
    this.detalle = detalle;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function leerCuerpo(response: Response): Promise<unknown> {
  const tipo = response.headers.get("content-type") ?? "";
  if (tipo.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  const texto = await response.text();
  return texto || null;
}

function mensajeDeError(detalle: unknown, status: number): string {
  if (typeof detalle === "string" && detalle.trim()) {
    return detalle;
  }
  if (detalle && typeof detalle === "object") {
    const data = detalle as Record<string, unknown>;
    for (const campo of ["message", "error", "detail", "mensaje"]) {
      const valor = data[campo];
      if (typeof valor === "string" && valor.trim()) {
        return valor;
      }
    }
  }
  if (status === 401) {
    return "Tu sesión expiró. Vuelve a iniciar sesión.";
  }
  if (status === 403) {
    return "No tienes permiso para realizar esta acción.";
  }
  return "No se pudo completar la solicitud.";
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers: headersInit, ...rest } = options;
  const headers = new Headers(headersInit);
  headers.set("Accept", "application/json");

  let payload: BodyInit | undefined;
  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    payload = body;
  } else if (body !== undefined && body !== null) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...rest,
    headers,
    body: payload,
  });

  if (!response.ok) {
    const detalle = await leerCuerpo(response);
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(EVENTO_NO_AUTORIZADO));
    }
    throw new ApiError(response.status, mensajeDeError(detalle, response.status), detalle);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),

  upload: <T>(path: string, formData: FormData, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: formData }),
};
