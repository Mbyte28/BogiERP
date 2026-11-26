package com.tuempresa.sistema.historial;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.historial.dto.HistorialCajaDetalleResponse;
import com.tuempresa.sistema.historial.dto.HistorialCajaPageResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

@Path("/historial")
@Authenticated
@RequiereModulo({Modulo.HISTORIAL})
@Produces(MediaType.APPLICATION_JSON)
public class HistorialResource {

    private static final int TAMANO_MAXIMO_PAGINA = 100;

    @Inject
    HistorialService servicio;

    @GET
    @Path("/cajas")
    public HistorialCajaPageResponse listar(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("30") int size) {
        if (page < 0 || size < 1) {
            throw Errores.badRequest("La paginación no es válida");
        }
        return servicio.listar(page, Math.min(size, TAMANO_MAXIMO_PAGINA));
    }

    @GET
    @Path("/cajas/{id}")
    public HistorialCajaDetalleResponse detalle(@PathParam("id") Long id) {
        return servicio.detalle(id);
    }
}
