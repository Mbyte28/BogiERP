package com.tuempresa.sistema.inventario;

import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.inventario.dto.CategoriaRequest;
import com.tuempresa.sistema.inventario.dto.CategoriaResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/categorias")
@Authenticated
@RequiereModulo({Modulo.INVENTARIO})
@Produces(MediaType.APPLICATION_JSON)
public class CategoriaResource {

    @Inject
    InventarioService servicio;

    @GET
    public List<CategoriaResponse> listar() {
        return servicio.listarCategorias();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crear(@Valid CategoriaRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.crearCategoria(solicitud))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public CategoriaResponse actualizar(@PathParam("id") Long id, @Valid CategoriaRequest solicitud) {
        return servicio.actualizarCategoria(id, solicitud);
    }

    @DELETE
    @Path("/{id}")
    public Response eliminar(@PathParam("id") Long id) {
        servicio.eliminarCategoria(id);
        return Response.noContent().build();
    }
}
