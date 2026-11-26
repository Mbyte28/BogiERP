package com.tuempresa.sistema.clientes;

import com.tuempresa.sistema.clientes.dto.CrearFiadoRequest;
import com.tuempresa.sistema.clientes.dto.DeudaDepartamentoResponse;
import com.tuempresa.sistema.clientes.dto.DeudaGrupoResponse;
import com.tuempresa.sistema.clientes.dto.FiadoResponse;
import com.tuempresa.sistema.clientes.dto.ItemFiadoRequest;
import com.tuempresa.sistema.clientes.dto.PagarFiadoRequest;
import com.tuempresa.sistema.clientes.dto.ProductoFiadoResponse;
import com.tuempresa.sistema.caja.Caja;
import com.tuempresa.sistema.caja.CajaRepository;
import com.tuempresa.sistema.common.error.Errores;
import com.tuempresa.sistema.common.security.UsuarioActual;
import com.tuempresa.sistema.inventario.MovimientoStock;
import com.tuempresa.sistema.inventario.Producto;
import com.tuempresa.sistema.inventario.ProductoRepository;
import com.tuempresa.sistema.inventario.TipoVenta;
import com.tuempresa.sistema.venta.PagoService;
import com.tuempresa.sistema.venta.Venta;
import com.tuempresa.sistema.venta.VentaItem;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class FiadoService {

    @Inject
    EntityManager entityManager;

    @Inject
    ProductoRepository productos;

    @Inject
    DepartamentoRepository departamentos;

    @Inject
    FiadoRepository fiados;

    @Inject
    EdificioService edificio;

    @Inject
    CajaRepository cajas;

    @Inject
    PagoService pagos;

    @Inject
    UsuarioActual usuarioActual;

    @Transactional
    public List<FiadoResponse> registrar(CrearFiadoRequest solicitud) {
        Departamento departamento = departamentos.findById(solicitud.departamentoId());
        if (departamento == null) {
            throw Errores.notFound("El departamento ya no existe; actualiza la lista y elige otro.");
        }
        if (solicitud.items() == null || solicitud.items().isEmpty()) {
            throw Errores.badRequest("Agrega al menos un producto al envío");
        }

        Map<Long, Producto> seleccionados = new LinkedHashMap<>();
        Map<Long, BigDecimal> cantidades = new HashMap<>();
        List<ItemFiadoRequest> lineas = new ArrayList<>();

        for (ItemFiadoRequest linea : solicitud.items()) {
            Producto producto = productos.findById(linea.productoId());
            if (producto == null || !producto.activo) {
                throw Errores.notFound("Producto no encontrado");
            }
            BigDecimal cantidad = linea.cantidad();
            if (cantidad == null || cantidad.signum() <= 0 || cantidad.scale() > 3) {
                throw Errores.badRequest("La cantidad del producto no es válida");
            }
            if (producto.tipoVenta == TipoVenta.UNIDAD && !esEntero(cantidad)) {
                throw Errores.badRequest(
                        "El producto " + producto.nombre + " se vende por unidad: la cantidad debe ser entera");
            }

            seleccionados.put(producto.id, producto);
            cantidades.merge(producto.id, cantidad, BigDecimal::add);
            lineas.add(linea);
        }

        for (Map.Entry<Long, BigDecimal> entrada : cantidades.entrySet()) {
            Producto producto = seleccionados.get(entrada.getKey());
            if (entrada.getValue().compareTo(producto.stock) > 0) {
                throw Errores.badRequest("Stock insuficiente de " + producto.nombre);
            }
            producto.stock = producto.stock.subtract(entrada.getValue());
        }

        List<FiadoResponse> creados = new ArrayList<>();
        for (ItemFiadoRequest linea : lineas) {
            Fiado fiado = new Fiado();
            fiado.departamentoId = departamento.id;
            fiado.productoId = linea.productoId();
            fiado.cantidad = linea.cantidad();
            fiado.usuarioId = usuarioActual.id();
            entityManager.persist(fiado);

            // El INSERT dispara el snapshot de la BD; refrescar para devolver lo guardado.
            entityManager.refresh(fiado);

            MovimientoStock movimiento = new MovimientoStock();
            movimiento.productoId = linea.productoId();
            movimiento.tipo = "FIADO";
            movimiento.cantidad = linea.cantidad().negate();
            movimiento.referenciaId = fiado.id;
            movimiento.usuarioId = usuarioActual.id();
            entityManager.persist(movimiento);

            creados.add(aRespuesta(fiado));
        }
        return creados;
    }

    @Transactional
    public List<FiadoResponse> porDepartamento(Long departamentoId) {
        Departamento departamento = departamentos.findById(departamentoId);
        if (departamento == null) {
            throw Errores.notFound("El departamento ya no existe; actualiza la lista y elige otro.");
        }
        return fiados.listarPorDepartamento(departamentoId).stream()
                .map(this::aRespuesta)
                .toList();
    }

    @Transactional
    public FiadoResponse pagar(Long id, PagarFiadoRequest solicitud) {
        Fiado fiado = fiados.findById(id);
        if (fiado == null) {
            throw Errores.notFound("Envío no encontrado");
        }
        if ("PAGADO".equals(fiado.estado)) {
            throw Errores.conflict("El envío ya está pagado");
        }

        Caja caja = cajas.findAbierta();
        if (caja == null) {
            throw Errores.badRequest("Abre la caja antes de registrar una venta");
        }

        // El envío ya descontó stock al crearse: aquí solo se cierra con una venta.
        BigDecimal total = fiado.subtotal.setScale(2, RoundingMode.HALF_UP);
        PagoService.Pago pago = pagos.calcular(solicitud.metodoPago(), solicitud.efectivoRecibido(),
                solicitud.montoEfectivo(), solicitud.medioTransferencia(), total);

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
        venta.fiadoId = fiado.id;
        venta.creadoEn = Instant.now();
        entityManager.persist(venta);

        VentaItem item = new VentaItem();
        item.ventaId = venta.id;
        item.productoId = fiado.productoId;
        item.nombreProducto = fiado.nombreProducto;
        item.tipoVenta = fiado.tipoVenta;
        item.cantidad = fiado.cantidad;
        item.precioUnitario = fiado.precioUnitario;
        item.costoUnitario = fiado.costoUnitario;
        item.subtotal = fiado.subtotal;
        entityManager.persist(item);

        fiado.estado = "PAGADO";
        fiado.pagadoEn = venta.creadoEn;
        fiado.pagadoPor = usuarioActual.id();
        return aRespuesta(fiado);
    }

    @Transactional
    public List<ProductoFiadoResponse> productos() {
        return entityManager.createQuery("from Producto where activo = true order by nombre", Producto.class)
                .getResultList().stream()
                .map(producto -> new ProductoFiadoResponse(producto.id, producto.nombre,
                        producto.tipoVenta, producto.precioVenta, producto.stock))
                .toList();
    }

    @Transactional
    public List<DeudaGrupoResponse> deudas(String nivel, Integer torre, Integer piso) {
        String filtro = nivel == null || nivel.isBlank() ? "edificio" : nivel.toLowerCase(Locale.ROOT);
        if (!List.of("edificio", "torre", "piso").contains(filtro)) {
            throw Errores.badRequest("El nivel de deudas no es válido");
        }
        if ("edificio".equals(filtro)) {
            edificio.validarUbicacion(null, null);
        } else if ("torre".equals(filtro)) {
            if (torre == null) {
                throw Errores.badRequest("Indica la torre");
            }
            edificio.validarUbicacion(torre, null);
        } else {
            if (torre == null || piso == null) {
                throw Errores.badRequest("Indica la torre y el piso");
            }
            edificio.validarUbicacion(torre, piso);
        }

        StringBuilder sql = new StringBuilder(
                "select f.fiado_id, f.departamento_id, f.producto_id, f.nombre_producto, f.tipo_venta, "
                        + "f.cantidad, f.precio_unitario, f.subtotal, f.creado_en, "
                        + "f.torre, f.piso, f.numero, f.etiqueta "
                        + "from v_fiados_pendientes f where 1 = 1 ");
        if (torre != null && !"edificio".equals(filtro)) {
            sql.append("and f.torre = :torre ");
        }
        if (piso != null && "piso".equals(filtro)) {
            sql.append("and f.piso = :piso ");
        }
        sql.append("order by f.torre, f.piso, f.numero, f.fiado_id");

        jakarta.persistence.Query consulta = entityManager.createNativeQuery(sql.toString());
        if (torre != null && !"edificio".equals(filtro)) {
            consulta.setParameter("torre", torre);
        }
        if (piso != null && "piso".equals(filtro)) {
            consulta.setParameter("piso", piso);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> filas = consulta.getResultList();
        Map<String, List<Fila>> grupos = new LinkedHashMap<>();
        for (Object[] fila : filas) {
            Fila actual = aFila(fila);
            String clave = switch (filtro) {
                case "edificio" -> "Torre " + actual.torre();
                case "torre" -> "Piso " + actual.piso() + " · Torre " + actual.torre();
                default -> actual.etiqueta();
            };
            grupos.computeIfAbsent(clave, ignorado -> new ArrayList<>()).add(actual);
        }

        List<DeudaGrupoResponse> respuesta = new ArrayList<>();
        for (Map.Entry<String, List<Fila>> entrada : grupos.entrySet()) {
            Map<Long, List<Fila>> porDepartamento = new LinkedHashMap<>();
            for (Fila actual : entrada.getValue()) {
                porDepartamento.computeIfAbsent(actual.fiado().departamentoId(),
                        ignorado -> new ArrayList<>()).add(actual);
            }
            List<DeudaDepartamentoResponse> departamentosDeuda = new ArrayList<>();
            for (Map.Entry<Long, List<Fila>> depto : porDepartamento.entrySet()) {
                List<Fila> lines = depto.getValue();
                departamentosDeuda.add(new DeudaDepartamentoResponse(
                        depto.getKey(),
                        lines.get(0).etiqueta(),
                        sumar(lines),
                        lines.size(),
                        lines.stream().map(Fila::fiado).toList()));
            }
            respuesta.add(new DeudaGrupoResponse(
                    entrada.getKey(), sumar(entrada.getValue()), entrada.getValue().size(), departamentosDeuda));
        }
        return respuesta;
    }

    private BigDecimal sumar(List<Fila> filas) {
        return filas.stream()
                .map(fila -> fila.fiado().subtotal())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private FiadoResponse aRespuesta(Fiado fiado) {
        return new FiadoResponse(fiado.id, fiado.departamentoId, fiado.productoId,
                fiado.nombreProducto, fiado.tipoVenta, fiado.cantidad, fiado.precioUnitario,
                fiado.subtotal, fiado.estado, fiado.creadoEn, fiado.pagadoEn);
    }

    private Fila aFila(Object[] fila) {
        FiadoResponse response = new FiadoResponse(
                ((Number) fila[0]).longValue(),
                ((Number) fila[1]).longValue(),
                ((Number) fila[2]).longValue(),
                String.valueOf(fila[3]),
                TipoVenta.valueOf(String.valueOf(fila[4])),
                decimal(fila[5]),
                decimal(fila[6]),
                decimal(fila[7]),
                "PENDIENTE",
                aInstant(fila[8]),
                null);
        return new Fila(response, entero(fila[9]), entero(fila[10]), String.valueOf(fila[12]));
    }

    private boolean esEntero(BigDecimal valor) {
        return valor.stripTrailingZeros().scale() <= 0;
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

    private int entero(Object valor) {
        return ((Number) valor).intValue();
    }

    private BigDecimal decimal(Object valor) {
        return valor instanceof BigDecimal decimal ? decimal : new BigDecimal(String.valueOf(valor));
    }

    private record Fila(FiadoResponse fiado, int torre, int piso, String etiqueta) {
    }
}
