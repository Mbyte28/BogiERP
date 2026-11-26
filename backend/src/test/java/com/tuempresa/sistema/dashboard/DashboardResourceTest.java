package com.tuempresa.sistema.dashboard;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tuempresa.sistema.common.RolesDePrueba;
import com.tuempresa.sistema.common.security.AuthResourceTest;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class DashboardResourceTest {

    private static final String COOKIE = "access_token";
    private static final ZoneId ZONA = ZoneId.of("America/Lima");

    @Inject
    AgroalDataSource dataSource;

    @AfterEach
    void limpiarRoles() {
        RolesDePrueba.limpiar(dataSource);
    }

    @Test
    void resumenCombinaVentasMermasYFiadosPagados() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        LocalDate hoy = LocalDate.now(ZONA);
        String desde = hoy.minusDays(1).toString();
        String hasta = hoy.plusDays(1).toString();

        Medidas antes = medidas(token, desde, hasta);

        long producto = crearProducto(token, "Dashboard " + sufijo(), "5.00", "2.00", "50");
        crearCajaConVenta(token, producto, "2");
        crearMerma(token, producto, "1");

        configurarSiHaceFalta(token);
        long departamento = primerDepartamento(token);
        JsonPath creados = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"departamentoId": %d, "items": [{"productoId": %d, "cantidad": 3}]}
                        """.formatted(departamento, producto))
                .post("/fiados")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath();
        long fiado = creados.getLong("[0].id");

        Medidas pendiente = medidas(token, desde, hasta);
        assertEquals(10.0, pendiente.ventas - antes.ventas, 0.02);
        assertEquals(6.0, pendiente.ganancia - antes.ganancia, 0.02);
        assertEquals(2.0, pendiente.merma - antes.merma, 0.02);
        assertEquals(2.0, pendiente.unidades - antes.unidades, 0.02);
        assertEquals(antes.lineas + 1, pendiente.lineas);

        given().cookie(COOKIE, token).post("/caja/cerrar");
        given().cookie(COOKIE, token).post("/caja/abrir").then().statusCode(201);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"metodoPago\":\"EFECTIVO\",\"efectivoRecibido\":15.00}")
                .patch("/fiados/{id}/pagar", fiado)
                .then()
                .statusCode(200);

        Medidas pagado = medidas(token, desde, hasta);
        assertEquals(15.0, pagado.ventas - pendiente.ventas, 0.02);
        assertEquals(9.0, pagado.ganancia - pendiente.ganancia, 0.02);
        assertEquals(3.0, pagado.unidades - pendiente.unidades, 0.02);
        assertEquals(pendiente.lineas + 1, pagado.lineas);
        assertEquals(pagado.ganancia - pagado.merma, pagado.neta, 0.02);
    }

    @Test
    void ventasMensualesDevuelveMesesConsecutivosYValidaLosParametros() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String mesActual = YearMonth.now(ZONA).toString();

        JsonPath mensuales = given()
                .cookie(COOKIE, token)
                .queryParam("meses", 6)
                .get("/dashboard/ventas-mensuales")
                .then()
                .statusCode(200)
                .body("size()", equalTo(6))
                .body("[5].mes", equalTo(mesActual))
                .extract()
                .jsonPath();
        assertTrue(mensuales.getDouble("[5].ventas") >= 0);
        assertTrue(mensuales.getDouble("[5].gananciaNeta") >= -1000);

        given()
                .cookie(COOKIE, token)
                .queryParam("anio", YearMonth.now(ZONA).getYear())
                .get("/dashboard/ventas-mensuales")
                .then()
                .statusCode(200)
                .body("size()", equalTo(12))
                .body("[10].mes", equalTo(mesActual))
                .body("[11].mes", equalTo(mesActual.substring(0, 4) + "-12"));

        given()
                .cookie(COOKIE, token)
                .queryParam("meses", 13)
                .get("/dashboard/ventas-mensuales")
                .then()
                .statusCode(400)
                .body("message", containsString("meses"));

        given()
                .cookie(COOKIE, token)
                .queryParam("meses", 6)
                .queryParam("anio", YearMonth.now(ZONA).getYear())
                .get("/dashboard/ventas-mensuales")
                .then()
                .statusCode(400)
                .body("message", containsString("ambos"));
    }

    @Test
    void detalleDelMesIncluyeResumenDiarioYProductosDestacados() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String mes = YearMonth.now(ZONA).toString();
        long producto = crearProducto(token, "Mes dashboard " + sufijo(), "4.00", "1.50", "20");
        crearCajaConVenta(token, producto, "2");

        given()
                .cookie(COOKIE, token)
                .queryParam("mes", mes)
                .get("/dashboard/mes")
                .then()
                .statusCode(200)
                .body("mes", equalTo(mes))
                .body("resumen.desde", equalTo(mes + "-01"))
                .body("resumen.ventas", greaterThanOrEqualTo(8.00f))
                .body("porDia.size()", greaterThanOrEqualTo(1))
                .body("topProductos.size()", greaterThanOrEqualTo(1))
                .body("topProductos[0].nombre", org.hamcrest.Matchers.notNullValue());

        given()
                .cookie(COOKIE, token)
                .queryParam("mes", "2026-13")
                .get("/dashboard/mes")
                .then()
                .statusCode(400)
                .body("message", containsString("formato"));

        given()
                .cookie(COOKIE, token)
                .get("/dashboard/mes")
                .then()
                .statusCode(400);
    }

    @Test
    void topProductosOrdenaEnAmbosSentidosYValidaElOrden() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        LocalDate hoy = LocalDate.now(ZONA);
        long producto = crearProducto(token, "Top dashboard " + sufijo(), "3.00", "1.00", "20");
        crearCajaConVenta(token, producto, "4");

        JsonPath desc = given()
                .cookie(COOKIE, token)
                .queryParam("desde", hoy.minusDays(1).toString())
                .queryParam("hasta", hoy.plusDays(1).toString())
                .queryParam("orden", "desc")
                .get("/dashboard/top-productos")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1))
                .extract()
                .jsonPath();
        assertOrden(desc.getList("cantidad", Float.class), true);

        JsonPath asc = given()
                .cookie(COOKIE, token)
                .queryParam("desde", hoy.minusDays(1).toString())
                .queryParam("hasta", hoy.plusDays(1).toString())
                .queryParam("orden", "asc")
                .get("/dashboard/top-productos")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1))
                .extract()
                .jsonPath();
        assertOrden(asc.getList("cantidad", Float.class), false);

        given()
                .cookie(COOKIE, token)
                .queryParam("orden", "otro")
                .get("/dashboard/top-productos")
                .then()
                .statusCode(400)
                .body("message", containsString("orden"));

        given()
                .cookie(COOKIE, token)
                .queryParam("desde", "no-fecha")
                .get("/dashboard/resumen")
                .then()
                .statusCode(400)
                .body("message", containsString("desde"));
    }

    @Test
    void permisosPorModuloSeValidanEnCadaEndpoint() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        String marca = sufijo();

        String usuarioDashboard = "dash_" + marca;
        crearUsuarioConModulo(tokenAdmin, usuarioDashboard, "DASHBOARD");
        String tokenDashboard = AuthResourceTest.iniciarSesion(usuarioDashboard, "clave123");

        given().cookie(COOKIE, tokenDashboard).get("/dashboard/ventas-mensuales").then().statusCode(200);
        given().cookie(COOKIE, tokenDashboard).get("/dashboard/resumen").then().statusCode(200);
        given().cookie(COOKIE, tokenDashboard).get("/dashboard/top-productos").then().statusCode(200);
        given().cookie(COOKIE, tokenDashboard).queryParam("mes", YearMonth.now(ZONA).toString())
                .get("/dashboard/mes").then().statusCode(200);

        String usuarioVenta = "dashventa_" + marca;
        crearUsuarioConModulo(tokenAdmin, usuarioVenta, "VENTA");
        String tokenVenta = AuthResourceTest.iniciarSesion(usuarioVenta, "clave123");

        given().cookie(COOKIE, tokenVenta).get("/dashboard/ventas-mensuales")
                .then().statusCode(403).body("message", containsString("módulo"));
        given().cookie(COOKIE, tokenVenta).get("/dashboard/resumen").then().statusCode(403);
        given().cookie(COOKIE, tokenVenta).get("/dashboard/top-productos").then().statusCode(403);
        given().cookie(COOKIE, tokenVenta).get("/dashboard/mes").then().statusCode(403);
    }

    private Medidas medidas(String token, String desde, String hasta) {
        JsonPath json = given()
                .cookie(COOKIE, token)
                .queryParam("desde", desde)
                .queryParam("hasta", hasta)
                .get("/dashboard/resumen")
                .then()
                .statusCode(200)
                .body("desde", equalTo(desde))
                .body("hasta", equalTo(hasta))
                .extract()
                .jsonPath();
        return new Medidas(
                json.getDouble("ventas"),
                json.getDouble("ganancia"),
                json.getDouble("merma"),
                json.getDouble("gananciaNeta"),
                json.getDouble("unidades"),
                json.getLong("lineas"));
    }

    private void assertOrden(List<Float> cantidades, boolean descendente) {
        for (int i = 1; i < cantidades.size(); i++) {
            float anterior = cantidades.get(i - 1);
            float actual = cantidades.get(i);
            assertTrue(descendente ? anterior >= actual : anterior <= actual,
                    "Orden inesperado: " + cantidades);
        }
    }

    private void crearCajaConVenta(String token, long productoId, String cantidad) {
        given().cookie(COOKIE, token).post("/caja/cerrar");
        given().cookie(COOKIE, token).post("/caja/abrir").then().statusCode(201);
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "items": [{"productoId": %d, "cantidad": %s}],
                          "metodoPago": "EFECTIVO",
                          "efectivoRecibido": 100.00
                        }
                        """.formatted(productoId, cantidad))
                .post("/ventas")
                .then()
                .statusCode(201);
        given().cookie(COOKIE, token).post("/caja/cerrar").then().statusCode(200);
    }

    private void crearMerma(String token, long productoId, String cantidad) {
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"productoId": %d, "cantidad": %s, "motivo": "Dashboard test"}
                        """.formatted(productoId, cantidad))
                .post("/mermas")
                .then()
                .statusCode(201);
    }

    private boolean edificioConfigurado(String token) {
        return given()
                .cookie(COOKIE, token)
                .get("/edificio/config")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getBoolean("configurado");
    }

    private void configurarSiHaceFalta(String token) {
        if (edificioConfigurado(token)) {
            return;
        }
        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"torres\": 1, \"pisosPorTorre\": 1, \"deptosPorPiso\": 3}")
                .post("/edificio/config")
                .then()
                .statusCode(201);
    }

    private long primerDepartamento(String token) {
        return given()
                .cookie(COOKIE, token)
                .get("/edificio/torres/1/pisos/1/departamentos")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("[0].id");
    }

    private long crearProducto(String token, String nombre, String precio, String costo, String stock) {
        return given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "%s", "categoriaId": null, "tipoVenta": "UNIDAD",
                         "precioVenta": %s, "costoActual": %s, "stock": %s}
                        """.formatted(nombre, precio, costo, stock))
                .post("/productos")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private void crearUsuarioConModulo(String token, String username, String modulo) {
        long rolId = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"nombre\": \"Rol %s\", \"modulos\": [\"%s\"]}".formatted(username, modulo))
                .post("/roles")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"username\": \"%s\", \"password\": \"clave123\", \"rolId\": %d}"
                        .formatted(username, rolId))
                .post("/usuarios")
                .then()
                .statusCode(201);
    }

    private String sufijo() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private record Medidas(double ventas, double ganancia, double merma, double neta,
            double unidades, long lineas) {
    }
}
