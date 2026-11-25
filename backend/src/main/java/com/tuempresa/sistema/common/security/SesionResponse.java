package com.tuempresa.sistema.common.security;

import java.util.List;

public record SesionResponse(
        Long id,
        String username,
        String rol,
        boolean principal,
        List<String> modulos) {
}
