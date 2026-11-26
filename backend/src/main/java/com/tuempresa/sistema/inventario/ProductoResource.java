package com.tuempresa.sistema.inventario;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.Modulo;
import com.tuempresa.sistema.common.security.RequiereModulo;
import com.tuempresa.sistema.inventario.dto.AjustarStockRequest;
import com.tuempresa.sistema.inventario.dto.ActualizarCostoRequest;
import com.tuempresa.sistema.inventario.dto.ProductoPageResponse;
import com.tuempresa.sistema.inventario.dto.ProductoRequest;
import com.tuempresa.sistema.inventario.dto.ProductoResponse;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Path("/productos")
@Authenticated
@RequiereModulo({Modulo.INVENTARIO})
@Produces(MediaType.APPLICATION_JSON)
public class ProductoResource {

    private static final int TAMANO_MAXIMO_PAGINA = 100;

    @Inject
    InventarioService servicio;

    @GET
    public ProductoPageResponse listar(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("25") int size,
            @QueryParam("q") String q,
            @QueryParam("categoriaId") Long categoriaId) {
        if (page < 0 || size < 1) {
            throw Errores.badRequest("La paginación no es válida");
        }
        return servicio.listarProductos(q, categoriaId, page, Math.min(size, TAMANO_MAXIMO_PAGINA));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response crear(@Valid ProductoRequest solicitud) {
        return Response.status(Response.Status.CREATED)
                .entity(servicio.crearProducto(solicitud))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProductoResponse actualizar(@PathParam("id") Long id, @Valid ProductoRequest solicitud) {
        return servicio.actualizarProducto(id, solicitud);
    }

    @PATCH
    @Path("/{id}/stock")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProductoResponse ajustarStock(@PathParam("id") Long id, @Valid AjustarStockRequest solicitud) {
        return servicio.ajustarStock(id, solicitud);
    }

    @PATCH
    @Path("/{id}/costo")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProductoResponse actualizarCosto(@PathParam("id") Long id, @Valid ActualizarCostoRequest solicitud) {
        return servicio.actualizarCosto(id, solicitud);
    }

    @POST
    @Path("/{id}/imagen")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public ProductoResponse guardarImagen(
            @PathParam("id") Long id,
            @RestForm("imagen") FileUpload imagen) {
        return servicio.guardarImagen(id, imagen);
    }
}
