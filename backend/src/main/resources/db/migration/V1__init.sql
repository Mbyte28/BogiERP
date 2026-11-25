-- =====================================================================
--  SISTEMA DE INVENTARIO, VENTAS Y FIADOS  ·  PostgreSQL 16
--
--  Migración inicial (Flyway). Crea el esquema completo del sistema.
--
--  Convenciones:
--   · Dinero      → NUMERIC(12,2)
--   · Cantidades  → NUMERIC(12,3)  (kilos con 3 decimales; unidades enteras)
--   · Fechas      → TIMESTAMPTZ (UTC). Agrupaciones por mes en 'America/Lima'.
--   · Cada línea de venta / fiado / merma guarda SNAPSHOT del precio y
--     costo del momento: cambiar el costo hoy NO altera datos pasados.
-- =====================================================================


-- =====================================================================
-- 0. FUNCIONES GENÉRICAS
-- =====================================================================
CREATE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 1. CUENTAS: ROLES, PERMISOS POR MÓDULO, USUARIOS
-- =====================================================================
CREATE TABLE rol (
  id            BIGSERIAL PRIMARY KEY,
  nombre        VARCHAR(60) NOT NULL,
  es_sistema    BOOLEAN NOT NULL DEFAULT FALSE,   -- PRINCIPAL y TRABAJADOR (no se borran)
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,   -- solo PRINCIPAL: acceso total y a CUENTAS
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_rol_nombre ON rol (lower(nombre));
CREATE UNIQUE INDEX uq_un_solo_rol_principal ON rol ((1)) WHERE es_principal;

CREATE TABLE rol_modulo (
  rol_id  BIGINT NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  modulo  VARCHAR(20) NOT NULL
          CHECK (modulo IN ('INVENTARIO','CLIENTES','VENTA','CAJA','HISTORIAL','CUENTAS','DASHBOARD')),
  PRIMARY KEY (rol_id, modulo)
);

-- El módulo CUENTAS solo puede pertenecer al rol principal.
CREATE FUNCTION fn_rol_modulo_validar() RETURNS trigger AS $$
DECLARE v_principal BOOLEAN;
BEGIN
  IF NEW.modulo = 'CUENTAS' THEN
    SELECT es_principal INTO v_principal FROM rol WHERE id = NEW.rol_id;
    IF NOT COALESCE(v_principal, FALSE) THEN
      RAISE EXCEPTION 'El módulo CUENTAS solo puede asignarse al rol principal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rol_modulo_validar
  BEFORE INSERT OR UPDATE ON rol_modulo
  FOR EACH ROW EXECUTE FUNCTION fn_rol_modulo_validar();

-- Los roles de sistema no se pueden borrar.
CREATE FUNCTION fn_rol_proteger() RETURNS trigger AS $$
BEGIN
  IF OLD.es_sistema THEN
    RAISE EXCEPTION 'No se puede eliminar el rol de sistema %', OLD.nombre;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rol_proteger
  BEFORE DELETE ON rol
  FOR EACH ROW EXECUTE FUNCTION fn_rol_proteger();

CREATE TABLE usuario (
  id             BIGSERIAL PRIMARY KEY,
  username       VARCHAR(60) NOT NULL,
  password_hash  VARCHAR(100) NOT NULL,            -- BCrypt, generado por el backend
  rol_id         BIGINT NOT NULL REFERENCES rol(id),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_usuario_username ON usuario (lower(username));
CREATE INDEX idx_usuario_rol ON usuario(rol_id);
CREATE TRIGGER trg_usuario_upd BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();


-- =====================================================================
-- 2. INVENTARIO
-- =====================================================================
CREATE TABLE categoria (
  id             BIGSERIAL PRIMARY KEY,
  nombre         VARCHAR(80) NOT NULL,
  icono          VARCHAR(60),                      -- nombre de icono lucide, ej: 'beer'
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_categoria_nombre ON categoria (lower(nombre));

CREATE TABLE producto (
  id                 BIGSERIAL PRIMARY KEY,
  nombre             VARCHAR(150) NOT NULL,
  categoria_id       BIGINT REFERENCES categoria(id) ON DELETE SET NULL,  -- NULL = sin categoría
  imagen             VARCHAR(255),                 -- nombre de archivo dentro de /uploads
  tipo_venta         VARCHAR(10) NOT NULL CHECK (tipo_venta IN ('UNIDAD','KILO')),
  precio_venta       NUMERIC(12,2) NOT NULL CHECK (precio_venta > 0),     -- por unidad o por kilo
  costo_actual       NUMERIC(12,2) CHECK (costo_actual >= 0),             -- NULL = costo aún no registrado
  stock              NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0), -- unidades o kilos
  fecha_vencimiento  DATE,                         -- opcional
  activo             BOOLEAN NOT NULL DEFAULT TRUE,-- borrado lógico
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- productos por unidad solo admiten stock entero
  CONSTRAINT ck_stock_entero_unidad CHECK (tipo_venta = 'KILO' OR stock = trunc(stock))
);
CREATE INDEX idx_producto_categoria   ON producto(categoria_id) WHERE activo;
CREATE INDEX idx_producto_nombre      ON producto(lower(nombre));
CREATE INDEX idx_producto_vencimiento ON producto(fecha_vencimiento) WHERE fecha_vencimiento IS NOT NULL AND activo;
CREATE TRIGGER trg_producto_upd BEFORE UPDATE ON producto
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

-- Historial de costos (se llena SOLO, por trigger, cada vez que cambia costo_actual)
CREATE TABLE producto_costo_historial (
  id           BIGSERIAL PRIMARY KEY,
  producto_id  BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  costo        NUMERIC(12,2) NOT NULL CHECK (costo >= 0),
  desde        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_costo_hist_producto ON producto_costo_historial(producto_id, desde DESC);

CREATE FUNCTION fn_producto_costo_historial() RETURNS trigger AS $$
BEGIN
  IF NEW.costo_actual IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.costo_actual IS DISTINCT FROM OLD.costo_actual) THEN
    INSERT INTO producto_costo_historial (producto_id, costo) VALUES (NEW.id, NEW.costo_actual);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producto_costo_historial
  AFTER INSERT OR UPDATE OF costo_actual ON producto
  FOR EACH ROW EXECUTE FUNCTION fn_producto_costo_historial();

-- Trazabilidad de cada cambio de stock (lo escribe el backend)
CREATE TABLE movimiento_stock (
  id             BIGSERIAL PRIMARY KEY,
  producto_id    BIGINT NOT NULL REFERENCES producto(id),
  tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO','AJUSTE','VENTA','FIADO','MERMA')),
  cantidad       NUMERIC(12,3) NOT NULL CHECK (cantidad <> 0),   -- + suma, - resta
  referencia_id  BIGINT,                                         -- id de venta / fiado / merma
  usuario_id     BIGINT REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_stock_producto ON movimiento_stock(producto_id, creado_en DESC);

-- Merma por vencimiento (pérdida del mes → dashboard)
CREATE TABLE merma (
  id              BIGSERIAL PRIMARY KEY,
  producto_id     BIGINT NOT NULL REFERENCES producto(id),
  cantidad        NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario  NUMERIC(12,2) CHECK (costo_unitario >= 0),     -- snapshot (auto si viene NULL)
  motivo          VARCHAR(100) NOT NULL DEFAULT 'VENCIMIENTO',
  usuario_id      BIGINT REFERENCES usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_merma_fecha    ON merma(creado_en);
CREATE INDEX idx_merma_producto ON merma(producto_id);

CREATE FUNCTION fn_merma_snapshot() RETURNS trigger AS $$
DECLARE p producto%ROWTYPE;
BEGIN
  SELECT * INTO p FROM producto WHERE id = NEW.producto_id;
  IF NEW.costo_unitario IS NULL THEN
    NEW.costo_unitario := p.costo_actual;
  END IF;
  IF p.tipo_venta = 'UNIDAD' AND NEW.cantidad <> trunc(NEW.cantidad) THEN
    RAISE EXCEPTION 'El producto "%" se maneja por unidad: la cantidad debe ser entera', p.nombre;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_merma_snapshot BEFORE INSERT ON merma
  FOR EACH ROW EXECUTE FUNCTION fn_merma_snapshot();


-- =====================================================================
-- 3. CAJA Y VENTAS
-- =====================================================================
CREATE TABLE caja (
  id           BIGSERIAL PRIMARY KEY,
  abierta_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en   TIMESTAMPTZ,                        -- NULL = caja abierta
  abierta_por  BIGINT NOT NULL REFERENCES usuario(id),
  cerrada_por  BIGINT REFERENCES usuario(id),
  CONSTRAINT ck_caja_fechas CHECK (cerrada_en IS NULL OR cerrada_en >= abierta_en)
);
-- Solo puede existir UNA caja abierta a la vez
CREATE UNIQUE INDEX uq_una_caja_abierta ON caja ((1)) WHERE cerrada_en IS NULL;
CREATE INDEX idx_caja_abierta_en ON caja(abierta_en DESC);

CREATE TABLE venta (
  id                   BIGSERIAL PRIMARY KEY,
  caja_id              BIGINT NOT NULL REFERENCES caja(id),
  usuario_id           BIGINT NOT NULL REFERENCES usuario(id),
  metodo_pago          VARCHAR(15) NOT NULL CHECK (metodo_pago IN ('EFECTIVO','TRANSFERENCIA','AMBOS')),
  total                NUMERIC(12,2) NOT NULL CHECK (total > 0),
  monto_efectivo       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_efectivo >= 0),
  monto_transferencia  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_transferencia >= 0),
  efectivo_recibido    NUMERIC(12,2),               -- lo que entregó el cliente ("Exacto" = igual al total)
  vuelto               NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (vuelto >= 0),
  medio_transferencia  VARCHAR(10) CHECK (medio_transferencia IN ('YAPE','PLIN')),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_venta_pago CHECK (
    ( metodo_pago = 'EFECTIVO'
      AND monto_efectivo = total AND monto_transferencia = 0
      AND medio_transferencia IS NULL
      AND efectivo_recibido IS NOT NULL AND efectivo_recibido >= total
      AND vuelto = efectivo_recibido - total )
    OR
    ( metodo_pago = 'TRANSFERENCIA'
      AND monto_efectivo = 0 AND monto_transferencia = total
      AND medio_transferencia IS NOT NULL AND vuelto = 0 )
    OR
    ( metodo_pago = 'AMBOS'
      AND monto_efectivo > 0 AND monto_transferencia > 0
      AND monto_efectivo + monto_transferencia = total
      AND medio_transferencia IS NOT NULL AND vuelto = 0 )
  )
);
CREATE INDEX idx_venta_caja  ON venta(caja_id);
CREATE INDEX idx_venta_fecha ON venta(creado_en);

-- Solo se vende con la caja abierta
CREATE FUNCTION fn_venta_caja_abierta() RETURNS trigger AS $$
DECLARE v_cerrada TIMESTAMPTZ;
BEGIN
  SELECT cerrada_en INTO v_cerrada FROM caja WHERE id = NEW.caja_id;
  IF v_cerrada IS NOT NULL THEN
    RAISE EXCEPTION 'La caja % está cerrada: no se pueden registrar ventas', NEW.caja_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_venta_caja_abierta BEFORE INSERT ON venta
  FOR EACH ROW EXECUTE FUNCTION fn_venta_caja_abierta();

CREATE TABLE venta_item (
  id               BIGSERIAL PRIMARY KEY,
  venta_id         BIGINT NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  producto_id      BIGINT NOT NULL REFERENCES producto(id),
  nombre_producto  VARCHAR(150) NOT NULL,           -- snapshot (auto si viene NULL)
  tipo_venta       VARCHAR(10)  NOT NULL CHECK (tipo_venta IN ('UNIDAD','KILO')),  -- snapshot
  cantidad         NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),   -- unidades o kilos
  precio_unitario  NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0), -- snapshot
  costo_unitario   NUMERIC(12,2) CHECK (costo_unitario >= 0),     -- snapshot; NULL = sin costo
  subtotal         NUMERIC(12,2) NOT NULL CHECK (subtotal > 0),
  CONSTRAINT ck_item_subtotal CHECK (abs(subtotal - cantidad * precio_unitario) <= 0.01)
);
CREATE INDEX idx_item_venta    ON venta_item(venta_id);
CREATE INDEX idx_item_producto ON venta_item(producto_id);

-- =====================================================================
-- 4. CLIENTES: TORRES / PISOS / DEPARTAMENTOS / FIADOS
-- =====================================================================
-- Una sola fila. Si existe, el front NO muestra el modal de configuración.
CREATE TABLE config_edificio (
  id               SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  torres           INT NOT NULL CHECK (torres > 0),
  pisos_por_torre  INT NOT NULL CHECK (pisos_por_torre > 0),
  deptos_por_piso  INT NOT NULL CHECK (deptos_por_piso BETWEEN 1 AND 99),
  configurado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departamento (
  id        BIGSERIAL PRIMARY KEY,
  torre     INT NOT NULL CHECK (torre > 0),
  piso      INT NOT NULL CHECK (piso > 0),
  numero    INT NOT NULL,                           -- piso*100 + n  → 101..108 / 1001..1008
  etiqueta  VARCHAR(60) NOT NULL,                   -- "Torre 1 Departamento 101"
  UNIQUE (torre, numero)
);
CREATE INDEX idx_depto_torre_piso ON departamento(torre, piso);

-- Genera config + TODOS los departamentos en una sola llamada (transaccional).
--   SELECT fn_configurar_edificio(5, 12, 8);
-- Piso 1 → 101..108 · Piso 12 → 1201..1208 · Etiqueta: "Torre 3 Departamento 105"
CREATE FUNCTION fn_configurar_edificio(p_torres INT, p_pisos INT, p_deptos INT) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM config_edificio) THEN
    RAISE EXCEPTION 'El edificio ya fue configurado';
  END IF;
  IF p_torres < 1 OR p_pisos < 1 OR p_deptos < 1 OR p_deptos > 99 THEN
    RAISE EXCEPTION 'Valores inválidos (torres>=1, pisos>=1, deptos por piso entre 1 y 99)';
  END IF;

  INSERT INTO config_edificio (id, torres, pisos_por_torre, deptos_por_piso)
  VALUES (1, p_torres, p_pisos, p_deptos);

  INSERT INTO departamento (torre, piso, numero, etiqueta)
  SELECT gt, gp, gp * 100 + gd, 'Torre ' || gt || ' Departamento ' || (gp * 100 + gd)
  FROM generate_series(1, p_torres) gt,
       generate_series(1, p_pisos)  gp,
       generate_series(1, p_deptos) gd;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE fiado (
  id               BIGSERIAL PRIMARY KEY,
  departamento_id  BIGINT NOT NULL REFERENCES departamento(id),
  producto_id      BIGINT NOT NULL REFERENCES producto(id),
  nombre_producto  VARCHAR(150) NOT NULL,           -- snapshot (auto si viene NULL)
  tipo_venta       VARCHAR(10)  NOT NULL CHECK (tipo_venta IN ('UNIDAD','KILO')),  -- snapshot
  cantidad         NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMERIC(12,2) NOT NULL CHECK (precio_unitario > 0),
  costo_unitario   NUMERIC(12,2) CHECK (costo_unitario >= 0),
  subtotal         NUMERIC(12,2) NOT NULL CHECK (subtotal > 0),
  estado           VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADO')),
  usuario_id       BIGINT REFERENCES usuario(id),   -- quién lo fió
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  pagado_en        TIMESTAMPTZ,
  pagado_por       BIGINT REFERENCES usuario(id),
  CONSTRAINT ck_fiado_subtotal CHECK (abs(subtotal - cantidad * precio_unitario) <= 0.01),
  CONSTRAINT ck_fiado_pago CHECK (
    (estado = 'PENDIENTE' AND pagado_en IS NULL) OR
    (estado = 'PAGADO'    AND pagado_en IS NOT NULL)
  )
);
CREATE INDEX idx_fiado_depto     ON fiado(departamento_id);
CREATE INDEX idx_fiado_pendiente ON fiado(departamento_id) WHERE estado = 'PENDIENTE';
CREATE INDEX idx_fiado_pagado_en ON fiado(pagado_en) WHERE estado = 'PAGADO';


-- =====================================================================
-- 5. SNAPSHOTS AUTOMÁTICOS (venta_item y fiado)
--    Si el backend no envía nombre / tipo / precio / costo / subtotal,
--    la BD los copia del producto en el momento del INSERT.
-- =====================================================================
CREATE FUNCTION fn_linea_snapshot() RETURNS trigger AS $$
DECLARE p producto%ROWTYPE;
BEGIN
  SELECT * INTO p FROM producto WHERE id = NEW.producto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto % no existe', NEW.producto_id;
  END IF;

  NEW.nombre_producto := COALESCE(NEW.nombre_producto, p.nombre);
  NEW.tipo_venta      := COALESCE(NEW.tipo_venta,      p.tipo_venta);
  NEW.precio_unitario := COALESCE(NEW.precio_unitario, p.precio_venta);
  NEW.costo_unitario  := COALESCE(NEW.costo_unitario,  p.costo_actual);
  NEW.subtotal        := COALESCE(NEW.subtotal, round(NEW.cantidad * NEW.precio_unitario, 2));

  IF NEW.tipo_venta = 'UNIDAD' AND NEW.cantidad <> trunc(NEW.cantidad) THEN
    RAISE EXCEPTION 'El producto "%" se vende por unidad: la cantidad debe ser entera', NEW.nombre_producto;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_venta_item_snapshot BEFORE INSERT ON venta_item
  FOR EACH ROW EXECUTE FUNCTION fn_linea_snapshot();
CREATE TRIGGER trg_fiado_snapshot BEFORE INSERT ON fiado
  FOR EACH ROW EXECUTE FUNCTION fn_linea_snapshot();

-- El total de la venta debe coincidir con la suma de sus ítems (se valida al COMMIT)
CREATE FUNCTION fn_venta_validar_total() RETURNS trigger AS $$
DECLARE v_suma NUMERIC; v_n INT;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0), COUNT(*) INTO v_suma, v_n
  FROM venta_item WHERE venta_id = NEW.id;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'La venta % no tiene productos', NEW.id;
  END IF;
  IF abs(v_suma - NEW.total) > 0.009 THEN
    RAISE EXCEPTION 'El total de la venta % (%) no coincide con la suma de sus productos (%)',
                    NEW.id, NEW.total, v_suma;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_venta_validar_total
  AFTER INSERT ON venta
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION fn_venta_validar_total();


-- =====================================================================
-- 6. VISTAS PARA CAJA, HISTORIAL, CATÁLOGO Y DASHBOARD
--    Todo calculado con los SNAPSHOTS, nunca con costo_actual.
--    "ganancia" es NULL cuando la línea no tiene costo (sin_costo = TRUE).
-- =====================================================================

-- Detalle de cada producto vendido (solo ventas) con su caja y su ganancia
CREATE VIEW v_venta_item_detalle AS
SELECT vi.id            AS item_id,
       v.id             AS venta_id,
       v.caja_id,
       v.creado_en      AS fecha,
       vi.producto_id,
       vi.nombre_producto,
       vi.tipo_venta,
       vi.cantidad,
       vi.precio_unitario,
       vi.costo_unitario,
       vi.subtotal,
       (vi.costo_unitario IS NULL) AS sin_costo,
       CASE WHEN vi.costo_unitario IS NULL THEN NULL
            ELSE vi.subtotal - round(vi.cantidad * vi.costo_unitario, 2) END AS ganancia
FROM venta_item vi
JOIN venta v ON v.id = vi.venta_id;

-- Resumen por caja → módulos Caja e Historial
CREATE VIEW v_caja_resumen AS
SELECT c.id                         AS caja_id,
       c.abierta_en,
       c.cerrada_en,
       (c.cerrada_en IS NULL)       AS abierta,
       COALESCE(v.total_ventas, 0)        AS total_ventas,          -- nº de ventas
       COALESCE(v.total_dinero, 0)        AS total_dinero,          -- S/ vendidos
       COALESCE(v.total_efectivo, 0)      AS total_efectivo,
       COALESCE(v.total_transferencia, 0) AS total_transferencia,
       COALESCE(i.total_unidades, 0)      AS total_unidades,        -- productos por unidad
       COALESCE(i.total_kilos, 0)         AS total_kilos,           -- productos por kilo
       COALESCE(i.total_lineas, 0)        AS total_lineas,
       COALESCE(i.ganancia, 0)            AS ganancia,              -- solo líneas con costo
       COALESCE(i.items_sin_costo, 0)     AS items_sin_costo
FROM caja c
LEFT JOIN (
  SELECT caja_id,
         COUNT(*)                 AS total_ventas,
         SUM(total)               AS total_dinero,
         SUM(monto_efectivo)      AS total_efectivo,
         SUM(monto_transferencia) AS total_transferencia
  FROM venta GROUP BY caja_id
) v ON v.caja_id = c.id
LEFT JOIN (
  SELECT caja_id,
         SUM(cantidad) FILTER (WHERE tipo_venta = 'UNIDAD') AS total_unidades,
         SUM(cantidad) FILTER (WHERE tipo_venta = 'KILO')   AS total_kilos,
         COUNT(*)                                           AS total_lineas,
         SUM(ganancia)                                      AS ganancia,
         COUNT(*) FILTER (WHERE sin_costo)                  AS items_sin_costo
  FROM v_venta_item_detalle GROUP BY caja_id
) i ON i.caja_id = c.id;

-- Modo "General" de una caja: productos vendidos y cantidades acumuladas
CREATE VIEW v_caja_producto AS
SELECT caja_id,
       producto_id,
       nombre_producto,
       tipo_venta,
       SUM(cantidad)  AS cantidad_total,
       SUM(subtotal)  AS ventas_total,
       SUM(ganancia)  AS ganancia,
       BOOL_OR(sin_costo) AS tiene_items_sin_costo
FROM v_venta_item_detalle
GROUP BY caja_id, producto_id, nombre_producto, tipo_venta;

-- Modo "Por venta": usar venta + v_venta_item_detalle WHERE caja_id = ? ORDER BY fecha

-- Más vendidos (catálogo: primero estos, luego el resto)
CREATE VIEW v_mas_vendidos AS
SELECT producto_id,
       SUM(cantidad) AS cantidad_total,
       SUM(subtotal) AS ventas_total
FROM venta_item
GROUP BY producto_id;

-- Productos sin costo registrado (card de alerta)
CREATE VIEW v_productos_sin_costo AS
SELECT id, nombre, tipo_venta, precio_venta, stock
FROM producto
WHERE activo AND costo_actual IS NULL;

-- Productos vencidos o por vencer (apoyo para registrar mermas)
CREATE VIEW v_productos_por_vencer AS
SELECT id, nombre, tipo_venta, stock, fecha_vencimiento,
       (fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM producto
WHERE activo AND fecha_vencimiento IS NOT NULL AND stock > 0;

-- Fiados pendientes con su ubicación (modal "Revisar fiados")
CREATE VIEW v_fiados_pendientes AS
SELECT f.id AS fiado_id,
       d.id AS departamento_id,
       d.torre, d.piso, d.numero, d.etiqueta,
       f.producto_id, f.nombre_producto, f.tipo_venta,
       f.cantidad, f.precio_unitario, f.subtotal, f.creado_en
FROM fiado f
JOIN departamento d ON d.id = f.departamento_id
WHERE f.estado = 'PENDIENTE';

-- Líneas que generan ingreso/ganancia para el dashboard:
--   · Ventas        → cuentan en la fecha de la venta.
--   · Fiados PAGADOS → cuentan en la fecha en que se pagaron.
CREATE VIEW v_lineas_ingreso AS
SELECT 'VENTA'::text AS origen,
       vi.producto_id, vi.nombre_producto, vi.tipo_venta,
       vi.cantidad, vi.precio_unitario, vi.costo_unitario, vi.subtotal,
       v.creado_en AS fecha,
       date_trunc('month', v.creado_en AT TIME ZONE 'America/Lima')::date AS mes,
       (vi.costo_unitario IS NULL) AS sin_costo,
       CASE WHEN vi.costo_unitario IS NULL THEN NULL
            ELSE vi.subtotal - round(vi.cantidad * vi.costo_unitario, 2) END AS ganancia
FROM venta_item vi
JOIN venta v ON v.id = vi.venta_id
UNION ALL
SELECT 'FIADO'::text,
       f.producto_id, f.nombre_producto, f.tipo_venta,
       f.cantidad, f.precio_unitario, f.costo_unitario, f.subtotal,
       f.pagado_en,
       date_trunc('month', f.pagado_en AT TIME ZONE 'America/Lima')::date,
       (f.costo_unitario IS NULL),
       CASE WHEN f.costo_unitario IS NULL THEN NULL
            ELSE f.subtotal - round(f.cantidad * f.costo_unitario, 2) END
FROM fiado f
WHERE f.estado = 'PAGADO';

-- Pérdida por merma por mes
CREATE VIEW v_merma_mensual AS
SELECT date_trunc('month', creado_en AT TIME ZONE 'America/Lima')::date AS mes,
       SUM(round(cantidad * COALESCE(costo_unitario, 0), 2)) AS perdida,
       COUNT(*) FILTER (WHERE costo_unitario IS NULL)        AS mermas_sin_costo
FROM merma
GROUP BY 1;

-- Resumen mensual del dashboard (ventas, ganancia, merma, ganancia neta)
--   Para un rango/periodo: SUM() de estas filas con WHERE mes BETWEEN ...
CREATE VIEW v_resumen_mensual AS
WITH l AS (
  SELECT mes,
         SUM(subtotal)                                      AS ventas,
         SUM(ganancia)                                      AS ganancia_bruta,
         SUM(cantidad) FILTER (WHERE tipo_venta = 'UNIDAD') AS unidades,
         SUM(cantidad) FILTER (WHERE tipo_venta = 'KILO')   AS kilos,
         COUNT(*) FILTER (WHERE sin_costo)                  AS items_sin_costo
  FROM v_lineas_ingreso
  GROUP BY mes
)
SELECT COALESCE(l.mes, m.mes)                                         AS mes,
       COALESCE(l.ventas, 0)                                          AS ventas,
       COALESCE(l.ganancia_bruta, 0)                                  AS ganancia_bruta,
       COALESCE(m.perdida, 0)                                         AS perdida_merma,
       COALESCE(l.ganancia_bruta, 0) - COALESCE(m.perdida, 0)         AS ganancia_neta,
       COALESCE(l.unidades, 0)                                        AS unidades,
       COALESCE(l.kilos, 0)                                           AS kilos,
       COALESCE(l.items_sin_costo, 0)                                 AS items_sin_costo
FROM l
FULL JOIN v_merma_mensual m ON m.mes = l.mes;

-- Productos más / menos vendidos por periodo: agrupar v_lineas_ingreso
--   SELECT producto_id, nombre_producto, tipo_venta, SUM(cantidad) c, SUM(subtotal) v, SUM(ganancia) g
--   FROM v_lineas_ingreso WHERE fecha >= :desde AND fecha < :hasta
--   GROUP BY 1,2,3 ORDER BY c DESC / ASC LIMIT 10;
-- (Para "los que menos se compraron" conviene incluir también productos con 0 ventas: LEFT JOIN desde producto.)


-- =====================================================================
-- 7. DATOS INICIALES (SEED)
-- =====================================================================
INSERT INTO rol (nombre, es_sistema, es_principal) VALUES
  ('PRINCIPAL',  TRUE, TRUE),
  ('TRABAJADOR', TRUE, FALSE);

-- PRINCIPAL: todos los módulos (incluye CUENTAS)
INSERT INTO rol_modulo (rol_id, modulo)
SELECT r.id, m.modulo
FROM rol r
CROSS JOIN (VALUES ('INVENTARIO'),('CLIENTES'),('VENTA'),('CAJA'),
                   ('HISTORIAL'),('CUENTAS'),('DASHBOARD')) AS m(modulo)
WHERE r.nombre = 'PRINCIPAL';

-- TRABAJADOR: permisos por defecto (el principal los puede modificar)
INSERT INTO rol_modulo (rol_id, modulo)
SELECT r.id, m.modulo
FROM rol r
CROSS JOIN (VALUES ('VENTA'),('CAJA'),('HISTORIAL')) AS m(modulo)
WHERE r.nombre = 'TRABAJADOR';

-- Categorías iniciales con icono (nombres de lucide-react)
INSERT INTO categoria (nombre, icono) VALUES
  ('Bebidas',            'cup-soda'),
  ('Alimentos',          'utensils'),
  ('Carnes',             'beef'),
  ('Lácteos',            'milk'),
  ('Frutas y verduras',  'apple'),
  ('Panadería',          'croissant'),
  ('Snacks y dulces',    'cookie'),
  ('Limpieza',           'spray-can'),
  ('Otros',              'package');

-- ⚠️ NO se crea ningún usuario aquí (requiere hash BCrypt).
--    El backend debe crear el usuario PRINCIPAL inicial al arrancar si no
--    existe ninguno, leyendo ADMIN_USERNAME y ADMIN_PASSWORD del .env.

-- =====================================================================
-- FIN
-- =====================================================================

