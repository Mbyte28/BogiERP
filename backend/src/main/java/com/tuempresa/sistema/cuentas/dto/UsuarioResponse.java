package com.tuempresa.sistema.cuentas.dto;

import java.time.Instant;

public record UsuarioResponse(
        Long id,
        String username,
        String rol,
        boolean principal,
        boolean activo,
        Instant creadoEn) {
}
