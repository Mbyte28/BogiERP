package com.tuempresa.sistema.inventario.dto;

public record CategoriaResponse(
        Long id,
        String nombre,
        String icono,
        long productos) {
}
