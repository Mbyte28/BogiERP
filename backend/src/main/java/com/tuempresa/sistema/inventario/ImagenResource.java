package com.tuempresa.sistema.inventario;

import com.tuempresa.sistema.common.error.Errores;
import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Locale;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Sirve las imágenes en desarrollo. En producción Nginx publica /uploads
 * directamente desde el volumen compartido.
 */
@Path("/uploads")
@Authenticated
public class ImagenResource {

    @ConfigProperty(name = "app.uploads.dir", defaultValue = "./uploads")
    String directorio;

    @GET
    @Path("/{nombre}")
    public Response obtener(@PathParam("nombre") String nombre) {
        String seguro = java.nio.file.Path.of(nombre).getFileName().toString();
        if (!seguro.matches("[0-9a-f-]{36}\\.(jpg|png|webp)")) {
            throw Errores.notFound("Imagen no encontrada");
        }

        java.nio.file.Path archivo = Paths.get(directorio).toAbsolutePath().normalize().resolve(seguro);
        if (!Files.isRegularFile(archivo)) {
            throw Errores.notFound("Imagen no encontrada");
        }

        try {
            return Response.ok(Files.readAllBytes(archivo), tipoContenido(seguro)).build();
        } catch (IOException ex) {
            throw Errores.notFound("Imagen no encontrada");
        }
    }

    private String tipoContenido(String nombre) {
        String extension = nombre.substring(nombre.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return switch (extension) {
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            default -> "image/jpeg";
        };
    }
}
