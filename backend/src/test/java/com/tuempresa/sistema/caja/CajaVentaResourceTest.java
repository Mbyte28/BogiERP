package com.tuempresa.sistema.caja;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.tuempresa.sistema.common.RolesDePrueba;
import com.tuempresa.sistema.common.security.AuthResourceTest;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CajaVentaResourceTest {

    private static final String COOKIE = "access_token";

    @Inject
    AgroalDataSource dataSource;

    @AfterEach
    void limpiarRoles() {
        RolesDePrueba.limpiar(dataSource);
    }

    @Test
    void catalogoPonePrimeroLosMasVendidosYRespetaFiltros() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        abrirCaja(token);
        String marca = "Cat" + sufijo();
        Long categoriaId = idCategoria(token, "Bebidas");
        long primero = crearProducto(token, marca + " A", "UNIDAD", "5.00", "3.00", "10", categoriaId);
        long segundo = crearProducto(token, marca + " B", "KILO", "10.00", "6.00", "5.000", categoriaId);

        registrarVenta(token, segundo, "1.000", "\"EFECTIVO\"", null, null, "15.00");

        JsonPath pagina = given()
                .cookie(COOKIE, token)
                .queryParam("q", marca)
                .get("/catalogo")
                .then()
                .statusCode(200)
                .body("total", equalTo(2))
                .body("items[0].masVendido", equalTo(true))
                .extract()
                .jsonPath();
        assertEquals(segundo, pagina.getLong("items[0].id"));
        assertEquals(primero, pagina.getLong("items[1].id"));
        assertEquals("Bebidas", pagina.getString("items[0].categoriaNombre"));

        given()
                .cookie(COOKIE, token)
                .queryParam("categoriaId", categoriaId)
                .queryParam("size", 1)
                .get("/catalogo")
                .then()
                .statusCode(200)
                .body("size", equalTo(1))
                .body("items.size()", equalTo(1));

        given()
                .cookie(COOKIE, token)
                .queryParam("page", -1)
                .get("/catalogo")
                .then()
                .statusCode(400);
    }

    @Test
    void ventaEnEfectivoCalculaVueltoDescuentaStockYRegistraMovimiento() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        abrirCaja(token);
        long producto = crearProducto(token, "Efectivo " + sufijo(), "UNIDAD", "5.50", "3.20", "10", null);

        JsonPath venta = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "items": [{"productoId": %d, "cantidad": 2}],
                          "metodoPago": "EFECTIVO",
                          "efectivoRecibido": 20.00
                        }
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(201)
                .body("total", equalTo(11.00f))
                .body("montoEfectivo", equalTo(11.00f))
                .body("montoTransferencia", equalTo(0.00f))
                .body("vuelto", equalTo(9.00f))
                .body("items[0].costoUnitario", equalTo(3.20f))
                .body("items[0].ganancia", equalTo(4.60f))
                .body("items[0].sinCosto", equalTo(false))
                .extract()
                .jsonPath();

        assertEquals(1, contar(
                "select count(*) from movimiento_stock where producto_id = ? and tipo = 'VENTA' "
                        + "and referencia_id = ? and cantidad = -2.000", producto, venta.getLong("id")));

        JsonPath actualizado = given()
                .cookie(COOKIE, token)
                .queryParam("q", "Efectivo")
                .get("/productos")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertEquals(8.000f, actualizado.getFloat("items[0].stock"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 1}], "metodoPago": "EFECTIVO",
                         "efectivoRecibido": 1.00}
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(400)
                .body("message", containsString("efectivo"));
    }

    @Test
    void transferenciaYAmbosValidanMedioYMontos() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        abrirCaja(token);
        long producto = crearProducto(token, "Pago " + sufijo(), "UNIDAD", "10.00", "4.00", "20", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 1}], "metodoPago": "TRANSFERENCIA",
                         "medioTransferencia": "YAPE"}
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(201)
                .body("total", equalTo(10.00f))
                .body("montoTransferencia", equalTo(10.00f))
                .body("medioTransferencia", equalTo("YAPE"))
                .body("vuelto", equalTo(0.00f));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 2}], "metodoPago": "AMBOS",
                         "montoEfectivo": 4.00, "medioTransferencia": "PLIN"}
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(201)
                .body("total", equalTo(20.00f))
                .body("montoEfectivo", equalTo(4.00f))
                .body("montoTransferencia", equalTo(16.00f))
                .body("medioTransferencia", equalTo("PLIN"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 1}], "metodoPago": "TRANSFERENCIA"}
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(400)
                .body("message", containsString("Yape"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 1}], "metodoPago": "AMBOS",
                         "montoEfectivo": 10.00, "medioTransferencia": "YAPE"}
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(400)
                .body("message", containsString("efectivo"));
    }

    @Test
    void snapshotsDeLaVentaNoCambianSiElCostoSeActualizaDespues() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        CajaResumen caja = abrirCaja(token);
        long producto = crearProducto(token, "Snapshot " + sufijo(), "KILO", "12.00", "7.00", "10.000", null);

        registrarVenta(token, producto, "2.000", "\"EFECTIVO\"", null, null, "30.00");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"costo\": 9.00}")
                .patch("/productos/{id}/costo", producto)
                .then()
                .statusCode(200);

        given()
                .cookie(COOKIE, token)
                .get("/caja/{id}/ventas", caja.id())
                .then()
                .statusCode(200)
                .body("[0].items[0].productoId", equalTo((int) producto))
                .body("[0].items[0].costoUnitario", equalTo(7.00f))
                .body("[0].items[0].subtotal", equalTo(24.00f))
                .body("[0].items[0].ganancia", equalTo(10.00f));
    }

    @Test
    void noSePuedeVenderConLaCajaCerrada() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        cerrarCaja(token);
        long producto = crearProducto(token, "Sin caja " + sufijo(), "UNIDAD", "5.00", null, "5", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 1}], "metodoPago": "EFECTIVO",
                         "efectivoRecibido": 5.00}
                        """.formatted(producto))
                .post("/ventas")
                .then()
                .statusCode(400)
                .body("message", containsString("caja"));
    }

    @Test
    void resumenDeCajaMuestraTotalesProductosYSinCosto() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        CajaResumen caja = abrirCaja(token);
        String marca = "Res" + sufijo();
        long conCosto = crearProducto(token, marca + " A", "UNIDAD", "5.00", "2.00", "10", null);
        long sinCosto = crearProducto(token, marca + " B", "KILO", "8.00", null, "5.000", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "items": [{"productoId": %d, "cantidad": 2},
                                    {"productoId": %d, "cantidad": 1.500}],
                          "metodoPago": "EFECTIVO",
                          "efectivoRecibido": 30.00
                        }
                        """.formatted(conCosto, sinCosto))
                .post("/ventas")
                .then()
                .statusCode(201);

        given()
                .cookie(COOKIE, token)
                .get("/caja/actual")
                .then()
                .statusCode(200)
                .body("abierta", equalTo(true))
                .body("caja.cajaId", equalTo(caja.id().intValue()))
                .body("caja.totalVentas", equalTo(1))
                .body("caja.totalDinero", equalTo(22.00f))
                .body("caja.totalUnidades", equalTo(2.000f))
                .body("caja.totalKilos", equalTo(1.500f))
                .body("caja.itemsSinCosto", equalTo(1))
                .body("caja.ganancia", equalTo(6.00f))
                .body("caja.productos.productoId", hasItems((int) conCosto, (int) sinCosto));

        given()
                .cookie(COOKIE, token)
                .get("/caja/{id}/resumen", caja.id())
                .then()
                .statusCode(200)
                .body("totalLineas", equalTo(2));

        given()
                .cookie(COOKIE, token)
                .get("/caja/{id}/ventas", caja.id())
                .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].items.size()", equalTo(2));
    }

    @Test
    void abrirYCerrarCajaRespetaLaUnicaCajaAbierta() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        cerrarCaja(token);

        given()
                .cookie(COOKIE, token)
                .post("/caja/abrir")
                .then()
                .statusCode(201)
                .body("abierta", equalTo(true));

        given()
                .cookie(COOKIE, token)
                .post("/caja/abrir")
                .then()
                .statusCode(409)
                .body("message", containsString("caja abierta"));

        given()
                .cookie(COOKIE, token)
                .post("/caja/cerrar")
                .then()
                .statusCode(200)
                .body("abierta", equalTo(false));

        given()
                .cookie(COOKIE, token)
                .get("/caja/actual")
                .then()
                .statusCode(200)
                .body("abierta", equalTo(false));

        given()
                .cookie(COOKIE, token)
                .post("/caja/cerrar")
                .then()
                .statusCode(404);
    }

    @Test
    void unidadesRechazaFraccionesYKiloAceptaTresDecimales() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        abrirCaja(token);
        long unidad = crearProducto(token, "Uni " + sufijo(), "UNIDAD", "5.00", null, "3", null);
        long kilo = crearProducto(token, "Kilo " + sufijo(), "KILO", "10.00", null, "3.000", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 1.5}], "metodoPago": "EFECTIVO",
                         "efectivoRecibido": 10.00}
                        """.formatted(unidad))
                .post("/ventas")
                .then()
                .statusCode(400)
                .body("message", containsString("entera"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [{"productoId": %d, "cantidad": 4}], "metodoPago": "EFECTIVO",
                         "efectivoRecibido": 25.00}
                        """.formatted(unidad))
                .post("/ventas")
                .then()
                .statusCode(400)
                .body("message", containsString("Stock"));

        registrarVenta(token, kilo, "0.750", "\"EFECTIVO\"", null, null, "10.00");
    }

    @Test
    void permisosPorModuloSeValidanEnCadaEndpoint() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        abrirCaja(tokenAdmin);
        String marca = sufijo();

        String soloCaja = "caja_" + marca;
        crearUsuarioConModulo(tokenAdmin, soloCaja, "CAJA");
        long producto = crearProducto(tokenAdmin, "Permisos " + marca, "UNIDAD", "5.00", null, "5", null);

        given()
                .cookie(COOKIE, AuthResourceTest.iniciarSesion(soloCaja, "clave123"))
                .get("/caja/actual")
                .then()
                .statusCode(200);

        given()
                .cookie(COOKIE, AuthResourceTest.iniciarSesion(soloCaja, "clave123"))
                .get("/catalogo")
                .then()
                .statusCode(403)
                .body("message", containsString("módulo"));

        String soloVenta = "venta_" + marca;
        crearUsuarioConModulo(tokenAdmin, soloVenta, "VENTA");
        String tokenVenta = AuthResourceTest.iniciarSesion(soloVenta, "clave123");

        given()
                .cookie(COOKIE, tokenVenta)
                .get("/catalogo")
                .then()
                .statusCode(200);

        given()
                .cookie(COOKIE, tokenVenta)
                .get("/caja/actual")
                .then()
                .statusCode(403);

        registrarVenta(tokenVenta, producto, "1", "\"EFECTIVO\"", null, null, "5.00");
    }

    private CajaResumen abrirCaja(String token) {
        given().cookie(COOKIE, token).post("/caja/cerrar");
        Long id = given()
                .cookie(COOKIE, token)
                .post("/caja/abrir")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("cajaId");
        return new CajaResumen(id);
    }

    private void cerrarCaja(String token) {
        given().cookie(COOKIE, token).post("/caja/cerrar");
    }

    private void crearUsuarioConModulo(String token, String username, String modulo) {
        String rol = "Rol " + username;
        long rolId = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "%s", "modulos": ["%s"]}
                        """.formatted(rol, modulo))
                .post("/roles")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(username, rolId))
                .post("/usuarios")
                .then()
                .statusCode(201);
    }

    private Long idCategoria(String token, String nombre) {
        return given()
                .cookie(COOKIE, token)
                .get("/categorias")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("find { it.nombre == '" + nombre + "' }.id");
    }

    private long crearProducto(String token, String nombre, String tipo, String precio,
            String costo, String stock, Long categoriaId) {
        String categoria = categoriaId == null ? "null" : String.valueOf(categoriaId);
        String costoValor = costo == null ? "null" : costo;
        return given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "nombre": "%s", "categoriaId": %s, "tipoVenta": "%s",
                          "precioVenta": %s, "costoActual": %s, "stock": %s
                        }
                        """.formatted(nombre, categoria, tipo, precio, costoValor, stock))
                .post("/productos")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private void registrarVenta(String token, long productoId, String cantidad, String metodo,
            String medio, String efectivo, String recibido) {
        String medioValor = medio == null ? "null" : "\"" + medio + "\"";
        String efectivoValor = efectivo == null ? "null" : efectivo;
        String recibidoValor = recibido == null ? "null" : recibido;
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "items": [{"productoId": %d, "cantidad": %s}],
                          "metodoPago": %s,
                          "medioTransferencia": %s,
                          "montoEfectivo": %s,
                          "efectivoRecibido": %s
                        }
                        """.formatted(productoId, cantidad, metodo, medioValor, efectivoValor, recibidoValor))
                .post("/ventas")
                .then()
                .statusCode(201);
    }

    private int contar(String sql, Object... parametros) throws Exception {
        try (Connection conexion = dataSource.getConnection();
                PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            for (int i = 0; i < parametros.length; i++) {
                sentencia.setObject(i + 1, parametros[i]);
            }
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                return resultado.getInt(1);
            }
        }
    }

    private String sufijo() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private record CajaResumen(Long id) {
    }
}
