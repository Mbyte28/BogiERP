package com.tuempresa.sistema.cuentas.dto;

import com.tuempresa.sistema.common.security.Modulo;
import java.util.List;

public record RolResponse(
        Long id,
        String nombre,
        boolean esSistema,
        boolean esPrincipal,
        List<Modulo> modulos) {
}
