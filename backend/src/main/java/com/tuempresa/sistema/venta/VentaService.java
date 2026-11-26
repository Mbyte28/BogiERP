package com.tuempresa.sistema.venta;

import com.tuempresa.sistema.caja.Caja;
import com.tuempresa.sistema.caja.CajaRepository;
import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.UsuarioActual;
import com.tuempresa.sistema.inventario.MovimientoStock;
import com.tuempresa.sistema.inventario.Producto;
import com.tuempresa.sistema.inventario.ProductoRepository;
import com.tuempresa.sistema.inventario.TipoVenta;
import com.tuempresa.sistema.venta.dto.CatalogoItemResponse;
import com.tuempresa.sistema.venta.dto.CatalogoPageResponse;
import com.tuempresa.sistema.venta.dto.CrearVentaRequest;
import com.tuempresa.sistema.venta.dto.ItemVentaRequest;
import com.tuempresa.sistema.venta.dto.VentaItemResponse;
import com.tuempresa.sistema.venta.dto.VentaResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class VentaService {

    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private static final BigDecimal CERO = BigDecimal.ZERO.setScale(2);

    @Inject
    EntityManager entityManager;

    @Inject
    ProductoRepository productos;

    @Inject
    CajaRepository cajas;

    @Inject
    VentaRepository ventas;

    @Inject
    UsuarioActual usuarioActual;

    @Inject
    PagoService pagos;

    @Transactional
    public CatalogoPageResponse catalogo(String q, Long categoriaId, int page, int size) {
        StringBuilder sql = new StringBuilder(
                "select p.id, p.nombre, c.nombre, c.icono, p.imagen, p.tipo_venta, p.precio_venta, "
                        + "p.costo_actual, p.stock, p.fecha_vencimiento, count(vi.id) "
                        + "from producto p "
                        + "left join categoria c on c.id = p.categoria_id "
                        + "left join venta_item vi on vi.producto_id = p.id "
                        + "where p.activo = true ");
        if (q != null && !q.isBlank()) {
            sql.append("and lower(p.nombre) like :q ");
        }
        if (categoriaId != null) {
            sql.append("and p.categoria_id = :categoriaId ");
        }
        sql.append("group by p.id, c.nombre, c.icono ");
        sql.append("order by count(vi.id) desc, lower(p.nombre), p.id");

        Query consulta = entityManager.createNativeQuery(sql.toString());
        if (q != null && !q.isBlank()) {
            consulta.setParameter("q", "%" + q.trim().toLowerCase(Locale.ROOT) + "%");
        }
        if (categoriaId != null) {
            consulta.setParameter("categoriaId", categoriaId);
        }
        consulta.setFirstResult(page * size).setMaxResults(size);

        @SuppressWarnings("unchecked")
        List<Object[]> filas = consulta.getResultList();
        List<CatalogoItemResponse> items = filas.stream().map(this::aCatalogoItem).toList();
        return new CatalogoPageResponse(items, productos.contar(q, categoriaId), page, size);
    }

    @Transactional
    public VentaResponse registrar(CrearVentaRequest solicitud) {
        Caja caja = cajas.findAbierta();
        if (caja == null) {
            throw Errores.badRequest("Abre la caja antes de registrar una venta");
        }

        Map<Long, Producto> seleccionados = new LinkedHashMap<>();
        Map<Long, BigDecimal> cantidades = new HashMap<>();
        List<VentaItem> items = new ArrayList<>();
        List<MovimientoStock> movimientos = new ArrayList<>();
        BigDecimal total = CERO;

        for (ItemVentaRequest linea : solicitud.items()) {
            Producto producto = productos.findById(linea.productoId());
            if (producto == null || !producto.activo) {
                throw Errores.notFound("Producto no encontrado");
            }
            BigDecimal cantidad = linea.cantidad();
            if (cantidad.signum() <= 0 || cantidad.scale() > 3) {
                throw Errores.badRequest("La cantidad del producto no es válida");
            }
            if (producto.tipoVenta == TipoVenta.UNIDAD && !esEntero(cantidad)) {
                throw Errores.badRequest(
                        "El producto " + producto.nombre + " se vende por unidad: la cantidad debe ser entera");
            }

            BigDecimal subtotal = producto.precioVenta.multiply(cantidad).setScale(2, RoundingMode.HALF_UP);
            total = total.add(subtotal);
            seleccionados.put(producto.id, producto);
            cantidades.merge(producto.id, cantidad, BigDecimal::add);

            VentaItem item = new VentaItem();
            item.productoId = producto.id;
            item.nombreProducto = producto.nombre;
            item.tipoVenta = producto.tipoVenta;
            item.cantidad = cantidad;
            item.precioUnitario = producto.precioVenta;
            item.costoUnitario = producto.costoActual;
            item.subtotal = subtotal;
            items.add(item);
        }

        for (Map.Entry<Long, BigDecimal> entrada : cantidades.entrySet()) {
            Producto producto = seleccionados.get(entrada.getKey());
            if (entrada.getValue().compareTo(producto.stock) > 0) {
                throw Errores.badRequest("Stock insuficiente de " + producto.nombre);
            }
            producto.stock = producto.stock.subtract(entrada.getValue());

            MovimientoStock movimiento = new MovimientoStock();
            movimiento.productoId = producto.id;
            movimiento.tipo = "VENTA";
            movimiento.cantidad = entrada.getValue().negate();
            movimiento.usuarioId = usuarioActual.id();
            entityManager.persist(movimiento);
            movimientos.add(movimiento);
        }

        PagoService.Pago pago = pagos.calcular(solicitud.metodoPago(), solicitud.efectivoRecibido(),
                solicitud.montoEfectivo(), solicitud.medioTransferencia(),
                total.setScale(2, RoundingMode.HALF_UP));

        Venta venta = new Venta();
        venta.cajaId = caja.id;
        venta.usuarioId = usuarioActual.id();
        venta.metodoPago = solicitud.metodoPago();
        venta.total = total;
        venta.montoEfectivo = pago.efectivo();
        venta.montoTransferencia = pago.transferencia();
        venta.efectivoRecibido = pago.recibido();
        venta.vuelto = pago.vuelto();
        venta.medioTransferencia = pago.medio();
        venta.creadoEn = Instant.now();
        entityManager.persist(venta);

        for (MovimientoStock movimiento : movimientos) {
            movimiento.referenciaId = venta.id;
        }
        for (VentaItem item : items) {
            item.ventaId = venta.id;
            entityManager.persist(item);
        }

        return aRespuesta(venta, items);
    }

    @Transactional
    public List<VentaResponse> detallesPorCaja(Long cajaId) {
        return ventas.listarPorCaja(cajaId).stream()
                .map(venta -> aRespuesta(venta, itemsPorVenta(venta.id)))
                .toList();
    }

    private List<VentaItem> itemsPorVenta(Long ventaId) {
        return entityManager
                .createQuery("from VentaItem where ventaId = ?1 order by id", VentaItem.class)
                .setParameter(1, ventaId)
                .getResultList();
    }

    private CatalogoItemResponse aCatalogoItem(Object[] fila) {
        Long id = ((Number) fila[0]).longValue();
        String nombre = String.valueOf(fila[1]);
        String categoriaNombre = fila[2] == null ? null : String.valueOf(fila[2]);
        String categoriaIcono = fila[3] == null ? null : String.valueOf(fila[3]);
        String imagen = fila[4] == null ? null : String.valueOf(fila[4]);
        TipoVenta tipo = TipoVenta.valueOf(String.valueOf(fila[5]));
        BigDecimal precio = aDecimal(fila[6]);
        BigDecimal costo = fila[7] == null ? null : aDecimal(fila[7]);
        BigDecimal stock = aDecimal(fila[8]);

        LocalDate vencimiento = null;
        if (fila[9] instanceof Date fecha) {
            vencimiento = fecha.toLocalDate();
        } else if (fila[9] instanceof LocalDate fecha) {
            vencimiento = fecha;
        }
        Long dias = vencimiento == null
                ? null
                : ChronoUnit.DAYS.between(LocalDate.now(ZONA), vencimiento);
        long vendidos = fila[10] == null ? 0 : ((Number) fila[10]).longValue();

        return new CatalogoItemResponse(id, nombre, categoriaNombre, categoriaIcono, imagen, tipo,
                precio, stock, costo == null, dias, vendidos > 0, vencimiento);
    }

    private VentaResponse aRespuesta(Venta venta, List<VentaItem> items) {
        List<VentaItemResponse> lineas = items.stream().map(this::aRespuestaItem).toList();
        return new VentaResponse(venta.id, venta.cajaId, venta.metodoPago, venta.total,
                venta.montoEfectivo, venta.montoTransferencia, venta.efectivoRecibido, venta.vuelto,
                venta.medioTransferencia, venta.creadoEn, lineas);
    }

    private VentaItemResponse aRespuestaItem(VentaItem item) {
        BigDecimal ganancia = item.costoUnitario == null ? null
                : item.subtotal.subtract(item.cantidad.multiply(item.costoUnitario))
                        .setScale(2, RoundingMode.HALF_UP);
        return new VentaItemResponse(item.id, item.productoId, item.nombreProducto, item.tipoVenta,
                item.cantidad, item.precioUnitario, item.costoUnitario, item.subtotal, ganancia,
                item.costoUnitario == null);
    }

    private BigDecimal aDecimal(Object valor) {
        return valor instanceof BigDecimal decimal ? decimal : new BigDecimal(String.valueOf(valor));
    }

    private boolean esEntero(BigDecimal valor) {
        return valor.stripTrailingZeros().scale() <= 0;
    }

}
