package com.tuempresa.sistema.venta;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.venta.dto.CatalogoPageResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

@Path("/catalogo")
@Authenticated
@RequiereModulo({Modulo.VENTA, Modulo.INVENTARIO})
@Produces(MediaType.APPLICATION_JSON)
public class CatalogoResource {

    private static final int TAMANO_MAXIMO_PAGINA = 100;

    @Inject
    VentaService servicio;

    @GET
    public CatalogoPageResponse listar(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("25") int size,
            @QueryParam("q") String q,
            @QueryParam("categoriaId") Long categoriaId) {
        if (page < 0 || size < 1) {
            throw Errores.badRequest("La paginación no es válida");
        }
        return servicio.catalogo(q, categoriaId, page, Math.min(size, TAMANO_MAXIMO_PAGINA));
    }
}
