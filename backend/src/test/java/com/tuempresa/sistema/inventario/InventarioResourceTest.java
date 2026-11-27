package com.tuempresa.sistema.inventario;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.tuempresa.sistema.common.RolesDePrueba;
import com.tuempresa.sistema.common.security.AuthResourceTest;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class InventarioResourceTest {

    private static final String COOKIE = "access_token";

    @Inject
    AgroalDataSource dataSource;

    @AfterEach
    void limpiarRoles() {
        RolesDePrueba.limpiar(dataSource);
    }

    @Test
    void categoriasSeListanSeCreanSeActualizanYBorran() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");

        given()
                .cookie(COOKIE, token)
                .get("/categorias")
                .then()
                .statusCode(200)
                .body("nombre", hasItems("Bebidas", "Otros"));

        String nombre = "Bebida " + sufijo();
        long id = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "%s", "icono": "cup-soda"}
                        """.formatted(nombre))
                .post("/categorias")
                .then()
                .statusCode(201)
                .body("nombre", equalTo(nombre))
                .body("productos", equalTo(0))
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "Bebida editada %s", "icono": "coffee"}
                        """.formatted(sufijo()))
                .put("/categorias/{id}", id)
                .then()
                .statusCode(200)
                .body("nombre", containsString("Bebida editada"))
                .body("icono", equalTo("coffee"));

        given()
                .cookie(COOKIE, token)
                .delete("/categorias/{id}", id)
                .then()
                .statusCode(204);

        given()
                .cookie(COOKIE, token)
                .delete("/categorias/{id}", id)
                .then()
                .statusCode(404);
    }

    @Test
    void crearCategoriaDuplicadaDevuelve409() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String nombre = "Duplicada " + sufijo();
        String cuerpo = """
                {"nombre": "%s"}
                """.formatted(nombre);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .post("/categorias")
                .then()
                .statusCode(201);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .post("/categorias")
                .then()
                .statusCode(409)
                .body("message", containsString("categoría"));
    }

    @Test
    void registrarVariosProductosActualizaStockYCostoYRegistraHistorialYMovimientos() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long conCosto = crearProducto(token, "Con costo " + sufijo(), "UNIDAD", "10.50", "4.00", "5", null);
        long sinCosto = crearProducto(token, "Sin cambio " + sufijo(), "UNIDAD", "3.50", "2.00", "2", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"items": [
                          {"productoId": %d, "cantidad": 3, "costo": 4.50},
                          {"productoId": %d, "cantidad": 5}
                        ]}
                        """.formatted(conCosto, sinCosto))
                .post("/productos/ingresos")
                .then()
                .statusCode(200)
                .body("size()", equalTo(2))
                .body("find { it.id == %d }.stock".formatted((int) conCosto), equalTo(8.000f))
                .body("find { it.id == %d }.costoActual".formatted((int) conCosto), equalTo(4.50f))
                .body("find { it.id == %d }.costoActual".formatted((int) sinCosto), equalTo(2.00f));

        assertEquals(2, contar("select count(*) from producto_costo_historial where producto_id = ?", conCosto));
        assertEquals(1, contar("select count(*) from producto_costo_historial where producto_id = ?", sinCosto));
        assertEquals(2, contar(
                "select count(*) from movimiento_stock where producto_id = ? and tipo = 'INGRESO'", conCosto));
        assertEquals(1, contar(
                "select count(*) from movimiento_stock where producto_id = ? and tipo = 'INGRESO' "
                        + "and cantidad = 3.000", conCosto));
        assertEquals(2, contar(
                "select count(*) from movimiento_stock where producto_id = ? and tipo = 'INGRESO'", sinCosto));
    }

    @Test
    void registrarInventarioSinCostoConservaElCostoVigente() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long id = crearProducto(token, "Sin cambio " + sufijo(), "UNIDAD", "3.00", "2.00", "1", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"items\": [{\"productoId\": %d, \"cantidad\": 2, \"costo\": null}]}".formatted(id))
                .post("/productos/ingresos")
                .then()
                .statusCode(200)
                .body("[0].costoActual", equalTo(2.00f))
                .body("[0].stock", equalTo(3.000f));

        assertEquals(1, contar("select count(*) from producto_costo_historial where producto_id = ?", id));
    }

    @Test
    void registrarInventarioRechazaProductosRepetidosYListaVacia() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long id = crearProducto(token, "Repetido " + sufijo(), "UNIDAD", "3.00", null, "1", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"items\": [{\"productoId\": %d, \"cantidad\": 1}, {\"productoId\": %d, \"cantidad\": 2}]}"
                        .formatted(id, id))
                .post("/productos/ingresos")
                .then()
                .statusCode(400)
                .body("message", containsString("No repitas"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"items\": []}")
                .post("/productos/ingresos")
                .then()
                .statusCode(400)
                .body("violations[0].message", containsString("entre 1 y 100"));
    }

    @Test
    void unidadRechazaCantidadesFraccionariasYKiloLasAcepta() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "Unidad fraccionaria %s", "tipoVenta": "UNIDAD", "precioVenta": 2, "stock": 1.5}
                        """.formatted(sufijo()))
                .post("/productos")
                .then()
                .statusCode(400)
                .body("message", containsString("enteras"));

        long id = crearProducto(token, "Kilo " + sufijo(), "KILO", "12.00", null, "1.500", null);

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"items\": [{\"productoId\": %d, \"cantidad\": -2}]}".formatted(id))
                .post("/productos/ingresos")
                .then()
                .statusCode(400)
                .body("violations[0].message", containsString("mayor a cero"));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"items\": [{\"productoId\": %d, \"cantidad\": 0.250}]}".formatted(id))
                .post("/productos/ingresos")
                .then()
                .statusCode(200)
                .body("[0].stock", equalTo(1.750f));
    }

    @Test
    void buscarYPaginarProductosDevuelveTotalYCategoria() {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String marca = "Busca" + sufijo();
        Long categoriaId = given()
                .cookie(COOKIE, token)
                .get("/categorias")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("find { it.nombre == 'Bebidas' }.id");

        long primero = crearProducto(token, marca + " A", "UNIDAD", "5.00", null, "2", categoriaId);
        long segundo = crearProducto(token, marca + " B", "KILO", "6.00", null, "3.500", categoriaId);

        JsonPath pagina = given()
                .cookie(COOKIE, token)
                .queryParam("q", marca)
                .queryParam("categoriaId", categoriaId)
                .queryParam("page", 0)
                .queryParam("size", 1)
                .get("/productos")
                .then()
                .statusCode(200)
                .body("total", equalTo(2))
                .body("size", equalTo(1))
                .body("items.size()", equalTo(1))
                .extract()
                .jsonPath();

        assertEquals(primero, pagina.getLong("items[0].id"));
        assertEquals("Bebidas", pagina.getString("items[0].categoriaNombre"));

        JsonPath segundaPagina = given()
                .cookie(COOKIE, token)
                .queryParam("q", marca)
                .queryParam("page", 1)
                .queryParam("size", 1)
                .get("/productos")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertEquals(segundo, segundaPagina.getLong("items[0].id"));
        assertNotEquals(primero, segundo);

        given()
                .cookie(COOKIE, token)
                .queryParam("page", -1)
                .get("/productos")
                .then()
                .statusCode(400);
    }

    @Test
    void mermaDescuentaStockTomaCostoYSeListaEnElMes() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        String nombre = "Mermable " + sufijo();
        long id = crearProducto(token, nombre, "KILO", "20.00", "7.25", "10.000", null);

        long mermaId = given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"productoId": %d, "cantidad": 2.000, "motivo": "ROTURA"}
                        """.formatted(id))
                .post("/mermas")
                .then()
                .statusCode(201)
                .body("cantidad", equalTo(2.000f))
                .body("costoUnitario", equalTo(7.25f))
                .body("total", equalTo(14.50f))
                .body("motivo", equalTo("ROTURA"))
                .extract()
                .jsonPath()
                .getLong("id");

        JsonPath producto = given()
                .cookie(COOKIE, token)
                .queryParam("q", nombre)
                .get("/productos")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertEquals(8.000f, producto.getFloat("items[0].stock"));

        String mes = YearMonth.now(ZoneId.of("America/Lima")).toString();
        given()
                .cookie(COOKIE, token)
                .queryParam("mes", mes)
                .get("/mermas")
                .then()
                .statusCode(200)
                .body("id", hasItems((int) mermaId))
                .body("productoNombre", hasItems(nombre));

        assertEquals(1, contar(
                "select count(*) from movimiento_stock where producto_id = ? and tipo = 'MERMA' "
                        + "and referencia_id = ?", id, mermaId));
        assertEquals(0, new java.math.BigDecimal("-2.000").compareTo(
                texto("select min(cantidad) from movimiento_stock where producto_id = ? and tipo = 'MERMA'", id)));

        given()
                .cookie(COOKIE, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"productoId": %d, "cantidad": 99, "motivo": "EXCESO"}
                        """.formatted(id))
                .post("/mermas")
                .then()
                .statusCode(400)
                .body("message", containsString("stock"));

        given()
                .cookie(COOKIE, token)
                .queryParam("mes", "2026/11")
                .get("/mermas")
                .then()
                .statusCode(400);
    }

    @Test
    void imagenRequiereEliminarLaAnteriorYSePuedeBorrar() throws Exception {
        String token = AuthResourceTest.iniciarSesion("admin", "admin123");
        long id = crearProducto(token, "Con imagen " + sufijo(), "UNIDAD", "9.00", null, "4", null);

        String nombreArchivo = given()
                .cookie(COOKIE, token)
                .multiPart("imagen", "producto.png", png(), "image/png")
                .post("/productos/{id}/imagen", id)
                .then()
                .statusCode(200)
                .body("imagen", containsString(".png"))
                .extract()
                .jsonPath()
                .getString("imagen");

        given()
                .cookie(COOKIE, token)
                .multiPart("imagen", "otra.png", png(), "image/png")
                .post("/productos/{id}/imagen", id)
                .then()
                .statusCode(400)
                .body("message", containsString("Elimina la imagen actual"));

        given()
                .cookie(COOKIE, token)
                .get("/uploads/{nombre}", nombreArchivo)
                .then()
                .statusCode(200)
                .header("Content-Type", containsString("image/png"));

        given()
                .cookie(COOKIE, token)
                .delete("/productos/{id}/imagen", id)
                .then()
                .statusCode(200)
                .body("imagen", equalTo(null));

        given()
                .cookie(COOKIE, token)
                .delete("/productos/{id}/imagen", id)
                .then()
                .statusCode(400)
                .body("message", containsString("no tiene una imagen"));

        given()
                .cookie(COOKIE, token)
                .multiPart("imagen", "producto.txt", "no es imagen".getBytes(), "text/plain")
                .post("/productos/{id}/imagen", id)
                .then()
                .statusCode(400)
                .body("message", containsString("JPG"));

        Files.deleteIfExists(Paths.get("uploads", nombreArchivo));
    }

    @Test
    void trabajadorSinInventarioNoPuedeEntrarYUnRolConInventarioSiPuede() {
        String tokenAdmin = AuthResourceTest.iniciarSesion("admin", "admin123");
        String sufijo = sufijo();

        long rolId = given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "Inventariador %s", "modulos": ["INVENTARIO"]}
                        """.formatted(sufijo))
                .post("/roles")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        String conPermiso = "inv_" + sufijo;
        given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(conPermiso, rolId))
                .post("/usuarios")
                .then()
                .statusCode(201);

        String sinPermiso = "sininv_" + sufijo;
        long rolTrabajador = given()
                .cookie(COOKIE, tokenAdmin)
                .get("/roles")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("find { it.nombre == 'TRABAJADOR' }.id");
        given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(sinPermiso, rolTrabajador))
                .post("/usuarios")
                .then()
                .statusCode(201);

        String sinCatalogo = "sincat_" + sufijo;
        long rolSinCatalogo = given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "Sin catálogo %s", "modulos": ["HISTORIAL"]}
                        """.formatted(sufijo))
                .post("/roles")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
        given()
                .cookie(COOKIE, tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"username": "%s", "password": "clave123", "rolId": %d}
                        """.formatted(sinCatalogo, rolSinCatalogo))
                .post("/usuarios")
                .then()
                .statusCode(201);

        String tokenConPermiso = AuthResourceTest.iniciarSesion(conPermiso, "clave123");
        String tokenSinPermiso = AuthResourceTest.iniciarSesion(sinPermiso, "clave123");
        String tokenSinCatalogo = AuthResourceTest.iniciarSesion(sinCatalogo, "clave123");

        given()
                .cookie(COOKIE, tokenConPermiso)
                .get("/productos")
                .then()
                .statusCode(200);

        given()
                .cookie(COOKIE, tokenConPermiso)
                .get("/catalogo")
                .then()
                .statusCode(200);

        given()
                .cookie(COOKIE, tokenSinCatalogo)
                .get("/catalogo")
                .then()
                .statusCode(403)
                .body("message", containsString("módulo"));

        given()
                .cookie(COOKIE, tokenSinPermiso)
                .get("/productos")
                .then()
                .statusCode(403)
                .body("message", containsString("módulo"));

        given()
                .cookie(COOKIE, tokenSinPermiso)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"nombre": "Prohibida %s"}
                        """.formatted(sufijo))
                .post("/categorias")
                .then()
                .statusCode(403);

        given()
                .cookie(COOKIE, tokenSinPermiso)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"productoId": 1, "cantidad": 1}
                        """)
                .post("/mermas")
                .then()
                .statusCode(403);
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
                          "nombre": "%s",
                          "categoriaId": %s,
                          "tipoVenta": "%s",
                          "precioVenta": %s,
                          "costoActual": %s,
                          "stock": %s
                        }
                        """.formatted(nombre, categoria, tipo, precio, costoValor, stock))
                .post("/productos")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private int contar(String sql, Object... parametros) throws Exception {
        try (Connection conexion = dataSource.getConnection();
                PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            asignar(sentencia, parametros);
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                return resultado.getInt(1);
            }
        }
    }

    private java.math.BigDecimal texto(String sql, Object... parametros) throws Exception {
        try (Connection conexion = dataSource.getConnection();
                PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            asignar(sentencia, parametros);
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                return resultado.getBigDecimal(1);
            }
        }
    }

    private void asignar(PreparedStatement sentencia, Object[] parametros) throws Exception {
        for (int i = 0; i < parametros.length; i++) {
            sentencia.setObject(i + 1, parametros[i]);
        }
    }

    private byte[] png() throws Exception {
        BufferedImage imagen = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        ImageIO.write(imagen, "png", salida);
        return salida.toByteArray();
    }

    private String sufijo() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
