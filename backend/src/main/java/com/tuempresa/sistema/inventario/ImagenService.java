package com.tuempresa.sistema.inventario;

import com.tuempresa.sistema.common.error.Errores;
import jakarta.enterprise.context.ApplicationScoped;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.IIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/** Guarda y redimensiona las imágenes de productos en el volumen compartido. */
@ApplicationScoped
public class ImagenService {

    private static final long TAMANO_MAXIMO = 5L * 1024 * 1024;
    private static final int LADO_MAXIMO = 800;

    @ConfigProperty(name = "app.uploads.dir", defaultValue = "./uploads")
    String directorio;

    public String guardar(FileUpload archivo) {
        if (archivo == null) {
            throw Errores.badRequest("Selecciona una imagen");
        }
        if (archivo.size() > TAMANO_MAXIMO) {
            throw Errores.badRequest("La imagen no puede superar los 5 MB");
        }

        try {
            byte[] contenido = Files.readAllBytes(archivo.filePath());
            if (contenido.length == 0) {
                throw Errores.badRequest("El archivo de imagen está vacío");
            }

            Formato formato = detectarFormato(contenido);
            byte[] bytes = formato.redimensionable()
                    ? redimensionar(contenido, formato.extension())
                    : contenido;
            Path destino = directorioImagenes();
            Files.createDirectories(destino);

            String nombre = UUID.randomUUID() + "." + formato.extension();
            Files.write(destino.resolve(nombre), bytes);
            return nombre;
        } catch (IOException ex) {
            throw Errores.badRequest("No se pudo guardar la imagen");
        }
    }

    public void borrar(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return;
        }
        try {
            Path archivo = directorioImagenes().resolve(Path.of(nombre).getFileName().toString());
            Files.deleteIfExists(archivo);
        } catch (IOException ex) {
            // Una imagen huérfana no debe impedir actualizar el producto.
        }
    }

    private Path directorioImagenes() throws IOException {
        return Paths.get(directorio).toAbsolutePath().normalize();
    }

    private Formato detectarFormato(byte[] bytes) {
        if (bytes.length > 3 && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) {
            return new Formato("jpg", true);
        }
        if (bytes.length > 8 && bytes[0] == (byte) 0x89 && bytes[1] == 'P'
                && bytes[2] == 'N' && bytes[3] == 'G') {
            return new Formato("png", true);
        }
        if (bytes.length > 12 && bytes[0] == 'R' && bytes[1] == 'I'
                && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return new Formato("webp", false);
        }
        throw Errores.badRequest("La imagen debe ser JPG, PNG o WebP");
    }

    private byte[] redimensionar(byte[] bytes, String extension) throws IOException {
        BufferedImage original;
        try {
            original = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IIOException ex) {
            throw Errores.badRequest("La imagen no es válida");
        }
        if (original == null) {
            return bytes;
        }

        int ancho = original.getWidth();
        int alto = original.getHeight();
        if (ancho <= LADO_MAXIMO && alto <= LADO_MAXIMO) {
            return bytes;
        }

        double escala = Math.min((double) LADO_MAXIMO / ancho, (double) LADO_MAXIMO / alto);
        int nuevoAncho = Math.max(1, (int) Math.round(ancho * escala));
        int nuevoAlto = Math.max(1, (int) Math.round(alto * escala));

        BufferedImage reducida = new BufferedImage(nuevoAncho, nuevoAlto, BufferedImage.TYPE_INT_RGB);
        Graphics2D lienzo = reducida.createGraphics();
        try {
            lienzo.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            lienzo.drawImage(original, 0, 0, nuevoAncho, nuevoAlto, null);
        } finally {
            lienzo.dispose();
        }

        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        if (!ImageIO.write(reducida, extension, salida)) {
            return bytes;
        }
        return salida.toByteArray();
    }

    private record Formato(String extension, boolean redimensionable) {
    }
}
