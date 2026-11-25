package com.tuempresa.sistema.venta;

import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.venta.dto.CrearVentaRequest;
import com.tuempresa.sistema.venta.dto.VentaResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/ventas")
@Authenticated
@RequiereModulo(Modulo.VENTA)
@Produces(MediaType.APPLICATION_JSON)
public class VentaResource {

    @Inject
    VentaService servicio;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crear(@Valid CrearVentaRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.registrar(solicitud))
                .build();
    }
}
