package com.tuempresa.sistema.inventario.dto;

import java.util.List;

public record ProductoPageResponse(
        List<ProductoResponse> items,
        long total,
        int page,
        int size) {
}
