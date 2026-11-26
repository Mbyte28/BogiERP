package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.cuentas.dto.ActualizarModulosRequest;
import com.tuempresa.sistema.cuentas.dto.CrearRolRequest;
import com.tuempresa.sistema.cuentas.dto.RolResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/roles")
@Authenticated
@RequiereModulo({Modulo.CUENTAS})
@Produces(MediaType.APPLICATION_JSON)
public class RolResource {

    @Inject
    RolService servicio;

    @GET
    public List<RolResponse> listar() {
        return servicio.listar();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crear(@Valid CrearRolRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.crear(solicitud))
                .build();
    }

    @PUT
    @Path("/{id}/modulos")
    @Consumes(MediaType.APPLICATION_JSON)
    public RolResponse actualizarModulos(
            @PathParam("id") Long id,
            @Valid ActualizarModulosRequest solicitud) {
        return servicio.actualizarModulos(id, solicitud);
    }
}
