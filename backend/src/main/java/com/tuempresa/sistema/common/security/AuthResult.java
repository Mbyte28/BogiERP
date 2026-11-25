package com.tuempresa.sistema.common.security;

public record AuthResult(String token, SesionResponse sesion) {
}
