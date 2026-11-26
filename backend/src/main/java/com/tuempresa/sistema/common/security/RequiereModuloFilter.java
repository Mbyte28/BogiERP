package com.tuempresa.sistema.common.security;

import com.tuempresa.sistema.common.error.ErrorResponse;
import jakarta.annotation.Priority;
import jakarta.json.JsonArray;
import jakarta.json.JsonString;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.util.Arrays;
import java.util.Collection;
import java.util.Optional;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * Valida el permiso de módulo de cada endpoint anotado con {@link RequiereModulo}.
 * Se ejecuta después de la autenticación JWT.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class RequiereModuloFilter implements ContainerRequestFilter {

    @Inject
    JsonWebToken jwt;

    @Context
    ResourceInfo resourceInfo;

    @Override
    public void filter(ContainerRequestContext request) {
        Optional<Modulo[]> requerido = moduloRequerido();
        if (requerido.isEmpty()) {
            return;
        }

        if (esPrincipal()) {
            return;
        }

        if (Arrays.stream(requerido.get()).noneMatch(this::tieneModulo)) {
            request.abortWith(Response.status(Response.Status.FORBIDDEN)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(new ErrorResponse("No tienes permiso para acceder a este módulo"))
                    .build());
        }
    }

    /**
     * Los claims se leen como tipos JSON-P, no como Boolean/List de Java.
     */
    private boolean esPrincipal() {
        Object claim = jwt.getClaim("principal");
        return Boolean.TRUE.equals(claim) || "true".equalsIgnoreCase(String.valueOf(claim));
    }

    private boolean tieneModulo(Modulo modulo) {
        Object claim = jwt.getClaim("modulos");
        if (claim instanceof JsonArray arreglo) {
            return arreglo.stream().anyMatch(item -> modulo.name().equals(nombre(item)));
        }
        if (claim instanceof Collection<?> coleccion) {
            return coleccion.stream().anyMatch(item -> modulo.name().equals(nombre(item)));
        }
        return false;
    }

    private String nombre(Object valor) {
        return valor instanceof JsonString texto ? texto.getString() : String.valueOf(valor);
    }

    private Optional<Modulo[]> moduloRequerido() {
        RequiereModulo anotacion = null;
        if (resourceInfo.getResourceMethod() != null) {
            anotacion = resourceInfo.getResourceMethod().getAnnotation(RequiereModulo.class);
        }
        if (anotacion == null && resourceInfo.getResourceClass() != null) {
            anotacion = resourceInfo.getResourceClass().getAnnotation(RequiereModulo.class);
        }
        return Optional.ofNullable(anotacion).map(RequiereModulo::value);
    }
}
