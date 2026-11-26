package com.tuempresa.sistema.caja;

import com.tuempresa.sistema.caja.dto.CajaActualResponse;
import com.tuempresa.sistema.caja.dto.CajaResumenResponse;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.venta.dto.VentaResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/caja")
@Authenticated
@RequiereModulo({Modulo.CAJA})
@Produces(MediaType.APPLICATION_JSON)
public class CajaResource {

    @Inject
    CajaService servicio;

    @GET
    @Path("/actual")
    @RequiereModulo({Modulo.CAJA, Modulo.VENTA, Modulo.CLIENTES})
    public CajaActualResponse actual() {
        return servicio.actual();
    }

    @POST
    @Path("/abrir")
    public Response abrir() {
        return Response.status(Response.Status.CREATED).entity(servicio.abrir()).build();
    }

    @POST
    @Path("/cerrar")
    public CajaResumenResponse cerrar() {
        return servicio.cerrar();
    }

    @GET
    @Path("/{id}/resumen")
    public CajaResumenResponse resumen(@PathParam("id") Long id) {
        return servicio.resumen(id);
    }

    @GET
    @Path("/{id}/ventas")
    public List<VentaResponse> ventas(@PathParam("id") Long id) {
        return servicio.ventas(id);
    }
}
