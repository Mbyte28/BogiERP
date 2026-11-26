-- =====================================================================
--  SEED DE PRUEBAS MANUALES — ERP Tienda Condominio
-- =====================================================================
--  Ejecutar sobre una base ya migrada por Flyway (no reemplaza V1__init.sql).
--  Es IDEMPOTENTE: limpia los datos operativos y los vuelve a crear.
--  NO borra roles de sistema ni categorías.
--
--  Usuarios creados (contraseña hasheada con BCrypt):
--    admin          / la contraseña ya vigente de .env (ADMIN_PASSWORD)
--                   PRINCIPAL (todos los módulos)
--    administradora / Admin123!              PRINCIPAL
--    vendedor       / Vendedor123            TRABAJADOR (VENTA, CAJA, HISTORIAL)
--    cajera         / Cajero123              TRABAJADOR (VENTA, CAJA, HISTORIAL)
--    solo_venta     / SoloVenta123           rol "SOLO VENTA" (solo VENTA)
--    inactivo       / Vendedor123            TRABAJADOR desactivado
--
--  Datos: 13 productos (unidad/kilo, sin costo, inactivo, por vencer),
--  3 mermas, 6 cajas cerradas con 2 ventas cada una + 1 caja abierta con
--  2 ventas (efectivo/ambos), edificio de 2 torres x 3 pisos x 4 depts
--  y 6 fiados (pendientes y pagados en meses distintos).
-- =====================================================================

BEGIN;

-- Conserva el hash vigente del usuario principal para no cambiar su contraseña
CREATE TEMP TABLE admin_original AS
SELECT username, password_hash FROM usuario WHERE lower(username) = 'admin';

-- ---------------------------------------------------------------------
-- 1. Limpieza: conserva rol, rol_modulo y categoria de la migración V1
-- ---------------------------------------------------------------------
TRUNCATE TABLE venta_item, venta, caja, fiado, merma, movimiento_stock,
               departamento, config_edificio, producto_costo_historial,
               producto, usuario
  RESTART IDENTITY CASCADE;

DELETE FROM rol WHERE es_sistema = FALSE;

-- Permisos base (los del propio V1__init.sql)
DELETE FROM rol_modulo;

INSERT INTO rol_modulo (rol_id, modulo)
SELECT r.id, m.modulo
FROM rol r
CROSS JOIN (VALUES ('INVENTARIO'), ('CLIENTES'), ('VENTA'), ('CAJA'),
                   ('HISTORIAL'), ('CUENTAS'), ('DASHBOARD')) AS m(modulo)
WHERE r.nombre = 'PRINCIPAL';

INSERT INTO rol_modulo (rol_id, modulo)
SELECT r.id, m.modulo
FROM rol r
CROSS JOIN (VALUES ('VENTA'), ('CAJA'), ('HISTORIAL')) AS m(modulo)
WHERE r.nombre = 'TRABAJADOR';

-- Rol a medida para probar la negación de permisos
INSERT INTO rol (nombre, es_sistema, es_principal) VALUES ('SOLO VENTA', FALSE, FALSE);
INSERT INTO rol_modulo (rol_id, modulo)
SELECT id, 'VENTA' FROM rol WHERE nombre = 'SOLO VENTA';

-- ---------------------------------------------------------------------
-- 2. Usuarios (hashes BCrypt generados con el mismo algoritmo del backend)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE u (nombre text, id bigint) ON COMMIT DROP;

WITH ins AS (
  INSERT INTO usuario (username, password_hash, rol_id, activo) VALUES
    ('admin',
     COALESCE((SELECT password_hash FROM admin_original LIMIT 1),
              '$2a$10$27ujZmzkKdCNn2e5HWhC0eqezU9XoLZ.V04pfjTR0QX2rEdgeRDMa'),
     (SELECT id FROM rol WHERE nombre = 'PRINCIPAL'), TRUE),
    ('administradora', '$2a$10$mfOWYSTNo71DzPEHg9dyvOSwZiPD9hI3IknLx63zmlOkpoGjqOcnK', (SELECT id FROM rol WHERE nombre = 'PRINCIPAL'), TRUE),
    ('vendedor',       '$2a$10$brsR3hjOk7na4NWnXvosPOxoIaeeiVuMomQAZkabN5KxoJGdcrdAu', (SELECT id FROM rol WHERE nombre = 'TRABAJADOR'), TRUE),
    ('cajera',         '$2a$10$sacqlVbLZen8dfvq3MWqcOw4pMmEYWdK/PuQbkJHU5OoivKis0c3e', (SELECT id FROM rol WHERE nombre = 'TRABAJADOR'), TRUE),
    ('solo_venta',     '$2a$10$zcqtPJnlvpm1TOqLKSTw6uHkElH1eV9FO0.X1yFk6XsiO363MkeTC', (SELECT id FROM rol WHERE nombre = 'SOLO VENTA'), TRUE),
    ('inactivo',       '$2a$10$brsR3hjOk7na4NWnXvosPOxoIaeeiVuMomQAZkabN5KxoJGdcrdAu', (SELECT id FROM rol WHERE nombre = 'TRABAJADOR'), FALSE)
  RETURNING username, id
)
INSERT INTO u SELECT username, id FROM ins;

-- ---------------------------------------------------------------------
-- 3. Productos
-- ---------------------------------------------------------------------
CREATE TEMP TABLE p (nombre text, id bigint) ON COMMIT DROP;

WITH ins AS (
  INSERT INTO producto (nombre, categoria_id, tipo_venta, precio_venta, costo_actual, stock, fecha_vencimiento, activo) VALUES
    ('Pan de molde',      (SELECT id FROM categoria WHERE lower(nombre) = 'panadería'),         'UNIDAD',  8.00,  3.50, 120.000, CURRENT_DATE + 2,  TRUE),
    ('Leche entera 1L',   (SELECT id FROM categoria WHERE lower(nombre) = 'lácteos'),           'UNIDAD',  6.50,  4.20,  80.000, CURRENT_DATE + 5,  TRUE),
    ('Café molido 500g',  (SELECT id FROM categoria WHERE lower(nombre) = 'bebidas'),           'UNIDAD', 22.00, 14.00,  35.000, CURRENT_DATE + 60, TRUE),
    ('Huevos docena',     (SELECT id FROM categoria WHERE lower(nombre) = 'alimentos'),         'UNIDAD', 12.00,  8.50,  40.000, CURRENT_DATE + 10, TRUE),
    ('Carne de res',      (SELECT id FROM categoria WHERE lower(nombre) = 'carnes'),            'KILO',   28.00, 19.50,  12.500, CURRENT_DATE + 3,  TRUE),
    ('Pollo fresco',      (SELECT id FROM categoria WHERE lower(nombre) = 'carnes'),            'KILO',   15.50, 10.80,  18.750, CURRENT_DATE + 1,  TRUE),
    ('Manzanas',          (SELECT id FROM categoria WHERE lower(nombre) = 'frutas y verduras'), 'KILO',    7.50,  4.00,  25.250, CURRENT_DATE + 7,  TRUE),
    ('Gaseosa 1.5L',      (SELECT id FROM categoria WHERE lower(nombre) = 'bebidas'),           'UNIDAD',  9.00,  5.50,  60.000, NULL,            TRUE),
    ('Detergente',        (SELECT id FROM categoria WHERE lower(nombre) = 'limpieza'),          'UNIDAD', 18.00, 11.00,  30.000, NULL,            TRUE),
    ('Producto sin costo',(SELECT id FROM categoria WHERE lower(nombre) = 'otros'),             'UNIDAD',  5.00,   NULL,  50.000, NULL,            TRUE),
    ('Producto inactivo', (SELECT id FROM categoria WHERE lower(nombre) = 'otros'),             'UNIDAD', 10.00,  6.00,   5.000, NULL,            FALSE),
    ('Yogurt natural',    (SELECT id FROM categoria WHERE lower(nombre) = 'lácteos'),           'UNIDAD',  4.50,  2.80,   0.000, CURRENT_DATE + 4,  TRUE),
    ('Pan integral',      (SELECT id FROM categoria WHERE lower(nombre) = 'panadería'),         'UNIDAD', 10.00,  4.50,  45.000, CURRENT_DATE + 2,  TRUE)
  RETURNING nombre, id
)
INSERT INTO p SELECT nombre, id FROM ins;

-- Ingresos iniciales de stock (trazabilidad)
INSERT INTO movimiento_stock (producto_id, tipo, cantidad, usuario_id)
SELECT id, 'INGRESO', stock, (SELECT id FROM u WHERE nombre = 'admin')
FROM producto
WHERE stock > 0;

-- ---------------------------------------------------------------------
-- 4. Mermas (el trigger guarda el costo del momento del producto)
-- ---------------------------------------------------------------------
WITH ins AS (
  INSERT INTO merma (producto_id, cantidad, motivo, creado_en, usuario_id) VALUES
    ((SELECT id FROM p WHERE nombre = 'Leche entera 1L'), 2,     'VENCIMIENTO', now() - interval '3 days', (SELECT id FROM u WHERE nombre = 'cajera')),
    ((SELECT id FROM p WHERE nombre = 'Pollo fresco'),    1.500, 'ROTURA',      now() - interval '1 day',  (SELECT id FROM u WHERE nombre = 'cajera')),
    ((SELECT id FROM p WHERE nombre = 'Pan de molde'),    3,     'ROTURA',      now() - interval '20 days', (SELECT id FROM u WHERE nombre = 'admin'))
  RETURNING id, producto_id, cantidad
)
INSERT INTO movimiento_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
SELECT producto_id, 'MERMA', -cantidad, id, (SELECT id FROM u WHERE nombre = 'cajera') FROM ins;

-- ---------------------------------------------------------------------
-- 5. Cajas cerradas con ventas de los últimos 6 meses (para Dashboard/Historial)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_caja bigint;
  v_venta bigint;
  i int;
  f timestamptz;
  v_admin bigint    := (SELECT id FROM u WHERE nombre = 'admin');
  v_vendedor bigint := (SELECT id FROM u WHERE nombre = 'vendedor');
  v_cajera bigint   := (SELECT id FROM u WHERE nombre = 'cajera');
  v_pan bigint      := (SELECT id FROM p WHERE nombre = 'Pan de molde');
  v_leche bigint    := (SELECT id FROM p WHERE nombre = 'Leche entera 1L');
  v_cafe bigint     := (SELECT id FROM p WHERE nombre = 'Café molido 500g');
  v_gaseosa bigint  := (SELECT id FROM p WHERE nombre = 'Gaseosa 1.5L');
  v_carne bigint    := (SELECT id FROM p WHERE nombre = 'Carne de res');
BEGIN
  FOR i IN 0..5 LOOP
    f := date_trunc('day', now() - (i || ' months')::interval) + interval '9 hours';

    INSERT INTO caja (abierta_en, abierta_por) VALUES (f, v_admin) RETURNING id INTO v_caja;

    -- Efectivo: 3 pan (24) + 2 leche (13) + 1 café (22) = 59.00
    INSERT INTO venta (caja_id, usuario_id, metodo_pago, total, monto_efectivo,
                       efectivo_recibido, vuelto, creado_en)
    VALUES (v_caja, v_vendedor, 'EFECTIVO', 59.00, 59.00, 100.00, 41.00,
            f + interval '30 minutes')
    RETURNING id INTO v_venta;

    INSERT INTO venta_item (venta_id, producto_id, cantidad) VALUES
      (v_venta, v_pan, 3),
      (v_venta, v_leche, 2),
      (v_venta, v_cafe, 1);

    -- Transferencia Yape: 2 gaseosas (18) + 1.5 kg carne (42) = 60.00
    INSERT INTO venta (caja_id, usuario_id, metodo_pago, total, monto_transferencia,
                       medio_transferencia, vuelto, creado_en)
    VALUES (v_caja, v_cajera, 'TRANSFERENCIA', 60.00, 60.00, 'YAPE', 0,
            f + interval '2 hours')
    RETURNING id INTO v_venta;

    INSERT INTO venta_item (venta_id, producto_id, cantidad) VALUES
      (v_venta, v_gaseosa, 2),
      (v_venta, v_carne, 1.500);

    UPDATE caja SET cerrada_en = f + interval '8 hours', cerrada_por = v_cajera
    WHERE id = v_caja;
  END LOOP;

  -- Caja ABIERTA para probar el módulo Caja en vivo
  INSERT INTO caja (abierta_en, abierta_por)
  VALUES (now() - interval '2 hours', v_cajera) RETURNING id INTO v_caja;

  -- Ambos (Plin): 1 pan (8) + 1 leche (6.50) = 14.50
  INSERT INTO venta (caja_id, usuario_id, metodo_pago, total, monto_efectivo,
                     monto_transferencia, medio_transferencia, vuelto, creado_en)
  VALUES (v_caja, v_vendedor, 'AMBOS', 14.50, 10.00, 4.50, 'PLIN', 0,
          now() - interval '1 hour')
  RETURNING id INTO v_venta;

  INSERT INTO venta_item (venta_id, producto_id, cantidad) VALUES
    (v_venta, v_pan, 1),
    (v_venta, v_leche, 1);

  -- Efectivo con producto SIN COSTO (para la card de alerta)
  INSERT INTO venta (caja_id, usuario_id, metodo_pago, total, monto_efectivo,
                     efectivo_recibido, vuelto, creado_en)
  VALUES (v_caja, v_vendedor, 'EFECTIVO', 5.00, 5.00, 20.00, 15.00,
          now() - interval '30 minutes')
  RETURNING id INTO v_venta;

  INSERT INTO venta_item (venta_id, producto_id, cantidad) VALUES
    (v_venta, (SELECT id FROM p WHERE nombre = 'Producto sin costo'), 1);
END $$;

-- Salidas de stock por ventas
INSERT INTO movimiento_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
SELECT vi.producto_id, 'VENTA', -vi.cantidad, vi.venta_id, v.usuario_id
FROM venta_item vi
JOIN venta v ON v.id = vi.venta_id;

-- ---------------------------------------------------------------------
-- 6. Edificio y fiados (pendientes + pagados en meses distintos)
-- ---------------------------------------------------------------------
SELECT fn_configurar_edificio(2, 3, 4);

INSERT INTO fiado (departamento_id, producto_id, cantidad, estado, usuario_id, creado_en, pagado_en)
VALUES
  ((SELECT id FROM departamento WHERE torre = 1 AND piso = 1 AND numero = 101),
   (SELECT id FROM p WHERE nombre = 'Pan de molde'), 2, 'PENDIENTE',
   (SELECT id FROM u WHERE nombre = 'vendedor'), now() - interval '2 days', NULL),

  ((SELECT id FROM departamento WHERE torre = 1 AND piso = 1 AND numero = 101),
   (SELECT id FROM p WHERE nombre = 'Gaseosa 1.5L'), 1, 'PENDIENTE',
   (SELECT id FROM u WHERE nombre = 'vendedor'), now() - interval '1 day', NULL),

  ((SELECT id FROM departamento WHERE torre = 1 AND piso = 1 AND numero = 102),
   (SELECT id FROM p WHERE nombre = 'Leche entera 1L'), 3, 'PAGADO',
   (SELECT id FROM u WHERE nombre = 'vendedor'), now() - interval '10 days', now() - interval '5 days'),

  ((SELECT id FROM departamento WHERE torre = 2 AND piso = 1 AND numero = 101),
   (SELECT id FROM p WHERE nombre = 'Café molido 500g'), 1, 'PAGADO',
   (SELECT id FROM u WHERE nombre = 'cajera'), now() - interval '40 days', now() - interval '35 days'),

  ((SELECT id FROM departamento WHERE torre = 2 AND piso = 2 AND numero = 202),
   (SELECT id FROM p WHERE nombre = 'Carne de res'), 1.250, 'PENDIENTE',
   (SELECT id FROM u WHERE nombre = 'vendedor'), now() - interval '3 days', NULL),

  ((SELECT id FROM departamento WHERE torre = 1 AND piso = 3 AND numero = 301),
   (SELECT id FROM p WHERE nombre = 'Pan integral'), 2, 'PAGADO',
   (SELECT id FROM u WHERE nombre = 'admin'), now() - interval '45 days', now() - interval '40 days');

INSERT INTO movimiento_stock (producto_id, tipo, cantidad, referencia_id, usuario_id)
SELECT producto_id, 'FIADO', -cantidad, id, usuario_id FROM fiado;

-- ---------------------------------------------------------------------
-- 7. Resumen para confirmar
-- ---------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'SEED OK: % usuarios, % productos, % cajas (% abierta), % ventas, % mermas, % departamentos, % fiados',
    (SELECT count(*) FROM usuario),
    (SELECT count(*) FROM producto),
    (SELECT count(*) FROM caja),
    (SELECT count(*) FROM caja WHERE cerrada_en IS NULL),
    (SELECT count(*) FROM venta),
    (SELECT count(*) FROM merma),
    (SELECT count(*) FROM departamento),
    (SELECT count(*) FROM fiado);
END $$;

COMMIT;
