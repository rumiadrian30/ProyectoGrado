-- ================================================================
--  FIE Explorer 3D — Migración 001: Esquema completo
--  Se ejecuta automáticamente al levantar el contenedor de BD
--  por estar en /docker-entrypoint-initdb.d/
-- ================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Función compartida para updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- buildings
CREATE TABLE IF NOT EXISTS buildings (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(150) NOT NULL,
    code         VARCHAR(20)  NOT NULL UNIQUE,
    type         VARCHAR(20)  NOT NULL DEFAULT 'secondary',
    description  TEXT,
    floor_count  INTEGER      NOT NULL DEFAULT 1,
    footprint    GEOMETRY(POLYGON, 4326),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_buildings_type   CHECK (type IN ('main','secondary','lab')),
    CONSTRAINT chk_buildings_floors CHECK (floor_count >= 1)
);
CREATE INDEX IF NOT EXISTS idx_buildings_code   ON buildings (code);
CREATE INDEX IF NOT EXISTS idx_buildings_active ON buildings (is_active);
CREATE TRIGGER trg_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'admin',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_attempts INTEGER      NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_admin_role CHECK (role IN ('admin','superadmin'))
);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);
CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- models_3d
CREATE TABLE IF NOT EXISTS models_3d (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id    UUID          NOT NULL REFERENCES buildings (id) ON DELETE CASCADE,
    model_type     VARCHAR(20)   NOT NULL,
    file_path      VARCHAR(500)  NOT NULL,
    file_size_mb   NUMERIC(8,2),
    triangle_count INTEGER,
    lod_level      INTEGER       NOT NULL DEFAULT 0,
    format         VARCHAR(10)   NOT NULL DEFAULT 'GLB',
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_models_type   CHECK (model_type IN ('exterior','interior')),
    CONSTRAINT chk_models_lod    CHECK (lod_level IN (0,1,2)),
    CONSTRAINT chk_models_format CHECK (format IN ('GLB','GLTF'))
);
CREATE INDEX IF NOT EXISTS idx_models_3d_building ON models_3d (building_id);
CREATE TRIGGER trg_models_3d_updated_at BEFORE UPDATE ON models_3d FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- hotspots
CREATE TABLE IF NOT EXISTS hotspots (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id  UUID          NOT NULL REFERENCES buildings (id) ON DELETE CASCADE,
    created_by   UUID          REFERENCES admin_users (id) ON DELETE SET NULL,
    name         VARCHAR(200)  NOT NULL,
    description  TEXT,
    type         VARCHAR(20)   NOT NULL DEFAULT 'lab',
    floor        INTEGER       NOT NULL DEFAULT 1,
    pos_x        NUMERIC(10,4) NOT NULL DEFAULT 0,
    pos_y        NUMERIC(10,4) NOT NULL DEFAULT 0,
    pos_z        NUMERIC(10,4) NOT NULL DEFAULT 0,
    coordinates  GEOMETRY(POINT,4326),
    schedule     VARCHAR(300),
    equipment    TEXT,
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_hotspots_type CHECK (type IN ('lab','office','service','access'))
);
CREATE INDEX IF NOT EXISTS idx_hotspots_building ON hotspots (building_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_active   ON hotspots (is_active);
CREATE TRIGGER trg_hotspots_updated_at BEFORE UPDATE ON hotspots FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- hotspot_images
CREATE TABLE IF NOT EXISTS hotspot_images (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotspot_id  UUID         NOT NULL REFERENCES hotspots (id) ON DELETE CASCADE,
    url         VARCHAR(500) NOT NULL,
    alt_text    VARCHAR(200),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotspot_images_hotspot ON hotspot_images (hotspot_id);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        REFERENCES admin_users (id) ON DELETE SET NULL,
    action       VARCHAR(20) NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    UUID,
    old_values   JSONB,
    new_values   JSONB,
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_audit_action CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACTIVATE','DEACTIVATE'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- error_logs
CREATE TABLE IF NOT EXISTS error_logs (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_code    VARCHAR(20),
    error_message TEXT        NOT NULL,
    stack_trace   TEXT,
    context       JSONB,
    severity      VARCHAR(10) NOT NULL DEFAULT 'ERROR',
    endpoint      VARCHAR(300),
    method        VARCHAR(10),
    user_id       UUID        REFERENCES admin_users (id) ON DELETE SET NULL,
    ip_address    INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_error_severity CHECK (severity IN ('DEBUG','INFO','WARN','ERROR','FATAL'))
);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity   ON error_logs (severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);

-- Vistas auxiliares
CREATE OR REPLACE VIEW v_audit_recent AS
    SELECT al.id, au.full_name AS admin_name, au.email AS admin_email,
           al.action, al.entity_type, al.entity_id, al.ip_address, al.created_at
    FROM audit_logs al LEFT JOIN admin_users au ON au.id = al.user_id
    ORDER BY al.created_at DESC LIMIT 500;

CREATE OR REPLACE VIEW v_errors_summary AS
    SELECT severity, endpoint, error_code, COUNT(*) AS total, MAX(created_at) AS last_seen
    FROM error_logs WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY severity, endpoint, error_code ORDER BY total DESC;

-- Seed: edificios iniciales de la FIE
INSERT INTO buildings (name, code, type, floor_count, description) VALUES
    ('Bloque principal FIE',               'FIE-MAIN',    'main',      3, 'Edificio principal. Secretaría, decanato, laboratorios de software y aulas.'),
    ('Laboratorio Electrónica',            'FIE-LAB-EA',  'lab',       2, 'Robótica, Industria 4.0, Hidráulica y Neumática, Máquinas Eléctricas.'),
    ('Laboratorio Software',               'FIE-LAB-SW',  'lab',       2, 'Programación, Redes, Desarrollo, Cisco, Microsoft y Multimedia.'),
    ('Laboratorio Compatibilidad EM',      'FIE-LAB-CEM', 'lab',       1, 'Cámara semi-anecoica y sistemas de medición de alta frecuencia.'),
    ('Edificio Administrativo',            'FIE-ADM',     'secondary', 2, 'Oficinas administrativas y bienestar estudiantil.')
ON CONFLICT (code) DO NOTHING;

-- Confirmación
DO $$ BEGIN
  RAISE NOTICE '=== FIE Explorer 3D — BD inicializada correctamente ===';
  RAISE NOTICE 'Tablas: buildings, admin_users, models_3d, hotspots, hotspot_images, audit_logs, error_logs';
  RAISE NOTICE 'Vistas: v_audit_recent, v_errors_summary';
END $$;
