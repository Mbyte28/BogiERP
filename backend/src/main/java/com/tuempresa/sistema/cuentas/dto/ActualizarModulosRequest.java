package com.tuempresa.sistema.cuentas.dto;

import com.tuempresa.sistema.common.security.Modulo;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record ActualizarModulosRequest(
        @NotNull(message = "Selecciona los módulos del rol")
        Set<Modulo> modulos) {
}
