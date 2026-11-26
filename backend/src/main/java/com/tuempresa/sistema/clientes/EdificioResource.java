package com.tuempresa.sistema.clientes;

import com.tuempresa.sistema.clientes.dto.ConfigEdificioResponse;
import com.tuempresa.sistema.clientes.dto.DatosConfigEdificio;
import com.tuempresa.sistema.clientes.dto.DepartamentoResponse;
import com.tuempresa.sistema.clientes.dto.PisoResponse;
import com.tuempresa.sistema.clientes.dto.TorreResponse;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
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

@Path("/edificio")
@Authenticated
@RequiereModulo(Modulo.CLIENTES)
@Produces(MediaType.APPLICATION_JSON)
public class EdificioResource {

    @Inject
    EdificioService servicio;

    @GET
    @Path("/config")
    public ConfigEdificioResponse configuracion() {
        return servicio.configuracion();
    }

    @POST
    @Path("/config")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response configurar(@Valid DatosConfigEdificio datos) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.configurar(datos))
                .build();
    }

    @PUT
    @Path("/config")
    @Consumes(MediaType.APPLICATION_JSON)
    public ConfigEdificioResponse actualizar(@Valid DatosConfigEdificio datos) {
        return servicio.actualizar(datos);
    }

    @GET
    @Path("/torres")
    public List<TorreResponse> torres() {
        return servicio.torres();
    }

    @GET
    @Path("/torres/{torre}/pisos")
    public List<PisoResponse> pisos(@PathParam("torre") int torre) {
        return servicio.pisos(torre);
    }

    @GET
    @Path("/torres/{torre}/pisos/{piso}/departamentos")
    public List<DepartamentoResponse> departamentos(
            @PathParam("torre") int torre, @PathParam("piso") int piso) {
        return servicio.departamentos(torre, piso);
    }
}
