package com.tuempresa.sistema.inventario;

import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.UsuarioActual;
import com.tuempresa.sistema.inventario.dto.CategoriaRequest;
import com.tuempresa.sistema.inventario.dto.CategoriaResponse;
import com.tuempresa.sistema.inventario.dto.CrearMermaRequest;
import com.tuempresa.sistema.inventario.dto.MermaResponse;
import com.tuempresa.sistema.inventario.dto.ProductoPageResponse;
import com.tuempresa.sistema.inventario.dto.ProductoRequest;
import com.tuempresa.sistema.inventario.dto.ProductoResponse;
import com.tuempresa.sistema.inventario.dto.RegistrarInventarioRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@ApplicationScoped
public class InventarioService {

    private static final ZoneId ZONA = ZoneId.of("America/Lima");

    @Inject
    CategoriaRepository categorias;

    @Inject
    ProductoRepository productos;

    @Inject
    MermaRepository mermas;

    @Inject
    ImagenService imagenes;

    @Inject
    UsuarioActual usuarioActual;

    @Inject
    EntityManager entityManager;

    @Transactional
    public List<CategoriaResponse> listarCategorias() {
        Map<Long, Long> conteos = categorias.contarProductosActivos().stream()
                .collect(Collectors.toMap(
                        fila -> ((Number) fila[0]).longValue(),
                        fila -> ((Number) fila[1]).longValue()));

        return categorias.listarOrdenadas().stream()
                .map(categoria -> new CategoriaResponse(
                        categoria.id,
                        categoria.nombre,
                        categoria.icono,
                        conteos.getOrDefault(categoria.id, 0L)))
                .toList();
    }

    @Transactional
    public CategoriaResponse crearCategoria(CategoriaRequest solicitud) {
        String nombre = solicitud.nombre().trim();
        if (categorias.existeNombre(nombre, null)) {
            throw Errores.conflict("Ya existe una categoría con ese nombre");
        }

        Categoria categoria = new Categoria();
        categoria.nombre = nombre;
        categoria.icono = normalizarIcono(solicitud.icono());
        categorias.persist(categoria);
        return new CategoriaResponse(categoria.id, categoria.nombre, categoria.icono, 0);
    }

    @Transactional
    public CategoriaResponse actualizarCategoria(Long id, CategoriaRequest solicitud) {
        Categoria categoria = buscarCategoria(id);
        String nombre = solicitud.nombre().trim();
        if (categorias.existeNombre(nombre, id)) {
            throw Errores.conflict("Ya existe una categoría con ese nombre");
        }

        categoria.nombre = nombre;
        categoria.icono = normalizarIcono(solicitud.icono());
        long total = productos.count("categoria = ?1 and activo = true", categoria);
        return new CategoriaResponse(categoria.id, categoria.nombre, categoria.icono, total);
    }

    @Transactional
    public void eliminarCategoria(Long id) {
        categorias.delete(buscarCategoria(id));
    }

    @Transactional
    public ProductoPageResponse listarProductos(String q, Long categoriaId, int page, int size) {
        List<ProductoResponse> items = productos.buscar(q, categoriaId, page, size).stream()
                .map(this::aRespuesta)
                .toList();
        return new ProductoPageResponse(items, productos.contar(q, categoriaId), page, size);
    }

    @Transactional
    public ProductoResponse crearProducto(ProductoRequest solicitud) {
        validarStock(solicitud.tipoVenta(), solicitud.stock() == null ? BigDecimal.ZERO : solicitud.stock());

        Producto producto = new Producto();
        producto.nombre = solicitud.nombre().trim();
        producto.categoria = buscarCategoriaOpcional(solicitud.categoriaId());
        producto.tipoVenta = solicitud.tipoVenta();
        producto.precioVenta = solicitud.precioVenta();
        producto.costoActual = solicitud.costoActual();
        producto.stock = solicitud.stock() == null ? BigDecimal.ZERO : solicitud.stock();
        producto.fechaVencimiento = solicitud.fechaVencimiento();
        productos.persist(producto);

        if (producto.stock.signum() > 0) {
            registrarMovimiento(producto, "INGRESO", producto.stock, null);
        }
        return aRespuesta(producto);
    }

    @Transactional
    public ProductoResponse actualizarProducto(Long id, ProductoRequest solicitud) {
        Producto producto = buscarProducto(id);
        validarStock(solicitud.tipoVenta(), producto.stock);

        producto.nombre = solicitud.nombre().trim();
        producto.categoria = buscarCategoriaOpcional(solicitud.categoriaId());
        producto.tipoVenta = solicitud.tipoVenta();
        producto.precioVenta = solicitud.precioVenta();
        producto.fechaVencimiento = solicitud.fechaVencimiento();
        return aRespuesta(producto);
    }

    @Transactional
    public List<ProductoResponse> registrarInventario(RegistrarInventarioRequest solicitud) {
        Set<Long> productosDelRegistro = new HashSet<>();
        List<ProductoResponse> actualizados = new ArrayList<>();

        for (RegistrarInventarioRequest.Linea linea : solicitud.items()) {
            if (!productosDelRegistro.add(linea.productoId())) {
                throw Errores.badRequest("No repitas productos en el registro de inventario");
            }

            Producto producto = buscarProducto(linea.productoId());
            BigDecimal cantidad = linea.cantidad();
            if (cantidad.signum() <= 0) {
                throw Errores.badRequest("La cantidad a ingresar debe ser mayor a cero");
            }
            validarStock(producto.tipoVenta, cantidad);
            validarStock(producto.tipoVenta, producto.stock.add(cantidad));

            producto.stock = producto.stock.add(cantidad);
            if (linea.costo() != null) {
                producto.costoActual = linea.costo().setScale(2, RoundingMode.HALF_UP);
            }
            registrarMovimiento(producto, "INGRESO", cantidad, null);
            actualizados.add(aRespuesta(producto));
        }

        return actualizados;
    }

    @Transactional
    public ProductoResponse guardarImagen(Long id, FileUpload archivo) {
        Producto producto = buscarProducto(id);
        if (producto.imagen != null && !producto.imagen.isBlank()) {
            throw Errores.badRequest("Elimina la imagen actual antes de subir otra");
        }
        producto.imagen = imagenes.guardar(archivo);
        return aRespuesta(producto);
    }

    @Transactional
    public ProductoResponse eliminarImagen(Long id) {
        Producto producto = buscarProducto(id);
        if (producto.imagen == null || producto.imagen.isBlank()) {
            throw Errores.badRequest("El producto no tiene una imagen para eliminar");
        }
        String anterior = producto.imagen;
        producto.imagen = null;
        imagenes.borrar(anterior);
        return aRespuesta(producto);
    }

    @Transactional
    public MermaResponse crearMerma(CrearMermaRequest solicitud) {
        Producto producto = buscarProducto(solicitud.productoId());
        if (!producto.activo) {
            throw Errores.badRequest("El producto no está activo");
        }
        if (solicitud.cantidad().compareTo(producto.stock) > 0) {
            throw Errores.badRequest("No hay stock suficiente para registrar la merma");
        }
        if (producto.tipoVenta == TipoVenta.UNIDAD && !esEntero(solicitud.cantidad())) {
            throw Errores.badRequest("El producto se maneja por unidad: la cantidad debe ser entera");
        }

        Merma merma = new Merma();
        merma.productoId = producto.id;
        merma.cantidad = solicitud.cantidad();
        merma.motivo = solicitud.motivo() == null || solicitud.motivo().isBlank()
                ? "VENCIMIENTO"
                : solicitud.motivo().trim();
        merma.usuarioId = usuarioActual.id();
        entityManager.persist(merma);
        entityManager.flush();
        entityManager.refresh(merma);

        producto.stock = producto.stock.subtract(solicitud.cantidad());
        registrarMovimiento(producto, "MERMA", solicitud.cantidad().negate(), merma.id);
        return aRespuesta(merma, producto.nombre);
    }

    @Transactional
    public List<MermaResponse> listarMermas(String mes) {
        String periodo = mes == null || mes.isBlank()
                ? YearMonth.now(ZONA).format(DateTimeFormatter.ofPattern("yyyy-MM"))
                : mes.trim();
        if (!periodo.matches("\\d{4}-\\d{2}")) {
            throw Errores.badRequest("El mes debe tener el formato AAAA-MM");
        }

        return mermas.listarPorMes(periodo).stream()
                .map(this::aRespuestaMerma)
                .toList();
    }

    private Categoria buscarCategoria(Long id) {
        Categoria categoria = categorias.findById(id);
        if (categoria == null) {
            throw Errores.notFound("Categoría no encontrada");
        }
        return categoria;
    }

    private Categoria buscarCategoriaOpcional(Long id) {
        return id == null ? null : buscarCategoria(id);
    }

    private Producto buscarProducto(Long id) {
        Producto producto = productos.findById(id);
        if (producto == null || !producto.activo) {
            throw Errores.notFound("Producto no encontrado");
        }
        return producto;
    }

    private void registrarMovimiento(Producto producto, String tipo, BigDecimal cantidad, Long referenciaId) {
        MovimientoStock movimiento = new MovimientoStock();
        movimiento.productoId = producto.id;
        movimiento.tipo = tipo;
        movimiento.cantidad = cantidad;
        movimiento.referenciaId = referenciaId;
        movimiento.usuarioId = usuarioActual.id();
        entityManager.persist(movimiento);
    }

    private void validarStock(TipoVenta tipo, BigDecimal stock) {
        if (stock.signum() < 0) {
            throw Errores.badRequest("El stock no puede ser negativo");
        }
        if (tipo == TipoVenta.UNIDAD && !esEntero(stock)) {
            throw Errores.badRequest("Los productos por unidad solo admiten cantidades enteras");
        }
    }

    private boolean esEntero(BigDecimal valor) {
        return valor.stripTrailingZeros().scale() <= 0;
    }

    private String normalizarIcono(String icono) {
        return icono == null || icono.isBlank() ? "package" : icono.trim().toLowerCase(Locale.ROOT);
    }

    private ProductoResponse aRespuesta(Producto producto) {
        Long dias = producto.fechaVencimiento == null
                ? null
                : ChronoUnit.DAYS.between(LocalDate.now(ZONA), producto.fechaVencimiento);
        return new ProductoResponse(
                producto.id,
                producto.nombre,
                producto.categoria == null ? null : producto.categoria.id,
                producto.categoria == null ? null : producto.categoria.nombre,
                producto.categoria == null ? null : producto.categoria.icono,
                producto.imagen,
                producto.tipoVenta,
                producto.precioVenta,
                producto.costoActual,
                producto.stock,
                producto.fechaVencimiento,
                producto.activo,
                producto.costoActual == null,
                dias,
                producto.creadoEn);
    }

    private MermaResponse aRespuesta(Merma merma, String nombreProducto) {
        BigDecimal total = merma.cantidad
                .multiply(merma.costoUnitario == null ? BigDecimal.ZERO : merma.costoUnitario)
                .setScale(2, RoundingMode.HALF_UP);
        return new MermaResponse(
                merma.id,
                merma.productoId,
                nombreProducto,
                merma.cantidad,
                merma.costoUnitario,
                total,
                merma.motivo,
                merma.creadoEn,
                merma.usuarioId);
    }

    private MermaResponse aRespuestaMerma(Object[] fila) {
        String nombreProducto = String.valueOf(fila[2]);
        Merma merma = new Merma();
        merma.id = ((Number) fila[0]).longValue();
        merma.productoId = ((Number) fila[1]).longValue();
        merma.cantidad = aDecimal(fila[3]);
        merma.costoUnitario = fila[4] == null ? null : aDecimal(fila[4]);
        merma.motivo = String.valueOf(fila[5]);
        merma.creadoEn = aInstant(fila[6]);
        merma.usuarioId = fila[7] == null ? null : ((Number) fila[7]).longValue();
        return aRespuesta(merma, nombreProducto);
    }

    private BigDecimal aDecimal(Object valor) {
        return valor instanceof BigDecimal decimal
                ? decimal
                : new BigDecimal(String.valueOf(valor));
    }

    private Instant aInstant(Object valor) {
        if (valor instanceof Instant instant) {
            return instant;
        }
        if (valor instanceof Timestamp marcaTiempo) {
            return marcaTiempo.toInstant();
        }
        if (valor instanceof OffsetDateTime fecha) {
            return fecha.toInstant();
        }
        return Instant.parse(String.valueOf(valor));
    }
}
