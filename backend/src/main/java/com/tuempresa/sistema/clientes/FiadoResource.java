package com.tuempresa.sistema.clientes;

import com.tuempresa.sistema.clientes.dto.CrearFiadoRequest;
import com.tuempresa.sistema.clientes.dto.DeudaGrupoResponse;
import com.tuempresa.sistema.clientes.dto.FiadoResponse;
import com.tuempresa.sistema.clientes.dto.PagarFiadoRequest;
import com.tuempresa.sistema.clientes.dto.ProductoFiadoResponse;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/fiados")
@Authenticated
@RequiereModulo({Modulo.CLIENTES})
@Produces(MediaType.APPLICATION_JSON)
public class FiadoResource {

    @Inject
    FiadoService servicio;

    @GET
    @Path("/productos")
    public List<ProductoFiadoResponse> productos() {
        return servicio.productos();
    }

    @GET
    @Path("/deudas")
    public List<DeudaGrupoResponse> deudas(
            @QueryParam("nivel") @DefaultValue("edificio") String nivel,
            @QueryParam("torre") Integer torre,
            @QueryParam("piso") Integer piso) {
        return servicio.deudas(nivel, torre, piso);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiereModulo({Modulo.VENTA, Modulo.CLIENTES})
    public Response crear(@Valid CrearFiadoRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.registrar(solicitud))
                .build();
    }

    @PATCH
    @Path("/{id}/pagar")
    @Consumes(MediaType.APPLICATION_JSON)
    public FiadoResponse pagar(@PathParam("id") Long id, @Valid @NotNull PagarFiadoRequest solicitud) {
        return servicio.pagar(id, solicitud);
    }
}
