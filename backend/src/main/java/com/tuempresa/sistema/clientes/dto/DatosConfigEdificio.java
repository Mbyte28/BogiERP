package com.tuempresa.sistema.clientes.dto;

import jakarta.validation.constraints.NotNull;

public record DatosConfigEdificio(
        @NotNull(message = "Indica el número de torres") Integer torres,
        @NotNull(message = "Indica el número de pisos por torre") Integer pisosPorTorre,
        @NotNull(message = "Indica el número de departamentos por piso") Integer deptosPorPiso) {
}
