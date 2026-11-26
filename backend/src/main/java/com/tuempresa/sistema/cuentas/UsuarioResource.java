package com.tuempresa.sistema.cuentas;

import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.cuentas.dto.CrearUsuarioRequest;
import com.tuempresa.sistema.cuentas.dto.UsuarioResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/usuarios")
@Authenticated
@RequiereModulo({Modulo.CUENTAS})
@Produces(MediaType.APPLICATION_JSON)
public class UsuarioResource {

    @Inject
    UsuarioService servicio;

    @GET
    public List<UsuarioResponse> listar() {
        return servicio.listar();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crear(@Valid CrearUsuarioRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.crear(solicitud))
                .build();
    }
}
