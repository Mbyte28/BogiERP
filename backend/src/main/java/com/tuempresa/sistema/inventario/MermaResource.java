package com.tuempresa.sistema.inventario;

import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.inventario.dto.CrearMermaRequest;
import com.tuempresa.sistema.inventario.dto.MermaResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/mermas")
@Authenticated
@RequiereModulo({Modulo.INVENTARIO})
@Produces(MediaType.APPLICATION_JSON)
public class MermaResource {

    @Inject
    InventarioService servicio;

    @GET
    public List<MermaResponse> listar(@QueryParam("mes") String mes) {
        return servicio.listarMermas(mes);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crear(@Valid CrearMermaRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.crearMerma(solicitud))
                .build();
    }
}
