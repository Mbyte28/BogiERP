package com.tuempresa.sistema.clientes;

import com.tuempresa.sistema.clientes.dto.FiadoResponse;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/departamentos")
@Authenticated
@RequiereModulo(Modulo.CLIENTES)
@Produces(MediaType.APPLICATION_JSON)
public class DepartamentoResource {

    @Inject
    FiadoService servicio;

    @GET
    @Path("/{id}/fiados")
    public List<FiadoResponse> fiados(@PathParam("id") Long id) {
        return servicio.porDepartamento(id);
    }
}
