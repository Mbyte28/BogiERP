package com.tuempresa.sistema.common.security;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

@ApplicationScoped
public class AdminInicial {

    @Inject
    AdminInicialService servicio;

    void alArrancar(@Observes StartupEvent evento) {
        servicio.crearSiHaceFalta();
    }
}
