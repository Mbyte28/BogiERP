package com.tuempresa.sistema.common.security;

import com.tuempresa.sistema.common.error.Errores;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;

/** Identifica al usuario autenticado para la trazabilidad de movimientos. */
@ApplicationScoped
public class UsuarioActual {

    @Inject
    JsonWebToken jwt;

    public Long id() {
        String subject = jwt.getSubject();
        if (subject == null) {
            throw Errores.unauthorized("La sesión no es válida");
        }
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException ex) {
            throw Errores.unauthorized("La sesión no es válida");
        }
    }
}
