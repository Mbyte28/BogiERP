package com.tuempresa.sistema.common.error;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Atajos para lanzar errores con el formato JSON de la API.
 */
public final class Errores {

    private Errores() {
    }

    public static WebApplicationException badRequest(String mensaje) {
        return respuesta(Response.Status.BAD_REQUEST, mensaje);
    }

    public static WebApplicationException unauthorized(String mensaje) {
        return respuesta(Response.Status.UNAUTHORIZED, mensaje);
    }

    public static WebApplicationException forbidden(String mensaje) {
        return respuesta(Response.Status.FORBIDDEN, mensaje);
    }

    public static WebApplicationException notFound(String mensaje) {
        return respuesta(Response.Status.NOT_FOUND, mensaje);
    }

    public static WebApplicationException conflict(String mensaje) {
        return respuesta(Response.Status.CONFLICT, mensaje);
    }

    private static WebApplicationException respuesta(Response.Status estado, String mensaje) {
        return new WebApplicationException(Response.status(estado)
                .type(MediaType.APPLICATION_JSON)
                .entity(new ErrorResponse(mensaje))
                .build());
    }
}
