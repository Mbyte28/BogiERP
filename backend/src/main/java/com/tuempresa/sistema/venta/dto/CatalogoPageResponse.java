package com.tuempresa.sistema.venta.dto;

import java.util.List;

public record CatalogoPageResponse(
        List<CatalogoItemResponse> items,
        long total,
        int page,
        int size) {
}
