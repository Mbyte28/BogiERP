package com.tuempresa.sistema.cuentas.dto;

import com.tuempresa.sistema.common.security.Modulo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record CrearRolRequest(
        @NotBlank(message = "El nombre del rol es obligatorio")
        @Size(max = 60, message = "El nombre no puede superar los 60 caracteres")
        String nombre,

        @NotNull(message = "Selecciona los módulos del rol")
        Set<Modulo> modulos) {
}
