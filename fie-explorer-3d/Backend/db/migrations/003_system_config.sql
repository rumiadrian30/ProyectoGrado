-- ============================================================
--  FIE Admin — Migración 003: Tabla de configuración del sistema
--  Ejecutar en pgAdmin 4 → Query Tool sobre fie_explorer_3d
--  PREREQUISITO: haber ejecutado 002_role_limits.sql antes
-- ============================================================

-- ── 1. Tabla principal de configuración ─────────────────────
-- Modelo clave-valor tipado. Cada fila es un parámetro del sistema.
-- Solo el superadmin puede modificarla desde el panel.

CREATE TABLE IF NOT EXISTS system_config (
    id            SERIAL        PRIMARY KEY,
    -- Clave única del parámetro. Ej: 'login.max_attempts'
    config_key    VARCHAR(80)   NOT NULL UNIQUE,
    -- Valor actual del parámetro (siempre texto; el backend convierte al tipo)
    config_value  VARCHAR(200)  NOT NULL,
    -- Tipo de dato para conversión: 'integer' | 'boolean' | 'string' | 'float'
    value_type    VARCHAR(10)   NOT NULL DEFAULT 'string',
    -- Valor original de fábrica (para poder hacer "restaurar por defecto")
    default_value VARCHAR(200)  NOT NULL,
    -- Descripción legible para mostrar en el panel
    label         VARCHAR(120)  NOT NULL,
    description   TEXT,
    -- Agrupación visual en el panel: 'login' | 'session' | 'accessibility' | 'system'
    group_name    VARCHAR(30)   NOT NULL DEFAULT 'system',
    -- Rango permitido (solo para integer/float)
    min_value     NUMERIC,
    max_value     NUMERIC,
    -- Si es false, no se muestra en el panel (parámetro interno)
    is_visible    BOOLEAN       NOT NULL DEFAULT TRUE,
    -- Auditoría
    updated_by    UUID          REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_config_value_type  CHECK (value_type  IN ('integer','boolean','string','float')),
    CONSTRAINT chk_config_group       CHECK (group_name  IN ('login','session','accessibility','system'))
);

COMMENT ON TABLE  system_config             IS 'Configuración general del sistema. Modificable solo por superadmin.';
COMMENT ON COLUMN system_config.config_key  IS 'Identificador único del parámetro. Ej: login.max_attempts';
COMMENT ON COLUMN system_config.value_type  IS 'Tipo para conversión en el backend: integer, boolean, string, float';
COMMENT ON COLUMN system_config.group_name  IS 'Grupo de configuración para agrupar en el panel UI';

-- Trigger updated_at
CREATE TRIGGER trg_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 2. Valores por defecto ───────────────────────────────────

INSERT INTO system_config
    (config_key,                   config_value, value_type, default_value, label,                              description,                                                         group_name,     min_value, max_value)
VALUES

-- ─── Grupo: login ─────────────────────────────────────────
('login.max_attempts',            '5',          'integer',  '5',           'Intentos máximos de login',         'Número de contraseñas incorrectas antes de bloquear la cuenta.',     'login',        1,         20),
('login.lockout_minutes',         '30',         'integer',  '30',          'Duración del bloqueo (minutos)',     'Tiempo que la cuenta permanece bloqueada tras agotar los intentos.', 'login',        1,         1440),
('login.lockout_warning_from',    '3',          'integer',  '3',           'Aviso desde el intento N',          'A partir de qué intento fallido se muestra la advertencia al usuario.','login',       1,         20),

-- ─── Grupo: session ───────────────────────────────────────
('session.token_expires_hours',   '8',          'integer',  '8',           'Duración de sesión (horas)',         'Tiempo de vida del token JWT. Al expirar se requiere nuevo login.',   'session',      1,         72),
('session.single_session',        'false',      'boolean',  'false',       'Sesión única por usuario',          'Si está activo, cerrar sesiones anteriores al hacer nuevo login.',      'session',      NULL,      NULL),

-- ─── Grupo: accessibility ─────────────────────────────────
('accessibility.font_size',       'medium',     'string',   'medium',      'Tamaño de fuente',                  'Tamaño base de fuente para el explorador público: small, medium, large.','accessibility',NULL,     NULL),
('accessibility.high_contrast',   'false',      'boolean',  'false',       'Alto contraste',                    'Activa modo de alto contraste en la interfaz pública.',                 'accessibility',NULL,     NULL),
('accessibility.reduced_motion',  'false',      'boolean',  'false',       'Reducir animaciones',               'Desactiva animaciones y transiciones para usuarios con fotosensibilidad.','accessibility',NULL,    NULL),
('accessibility.language',        'es',         'string',   'es',          'Idioma del sistema',                'Idioma principal del explorador público: es (español), en (inglés).',   'accessibility',NULL,     NULL),

-- ─── Grupo: system ────────────────────────────────────────
('system.maintenance_mode',       'false',      'boolean',  'false',       'Modo mantenimiento',                'Muestra pantalla de mantenimiento en el explorador público.',           'system',       NULL,      NULL),
('system.max_image_size_mb',      '5',          'integer',  '5',           'Tamaño máximo de imagen (MB)',      'Límite de peso para imágenes de hotspots.',                             'system',       1,         50),
('system.hotspot_pulse_animation','true',       'boolean',  'true',        'Animación de hotspots',             'Activa el efecto de pulso en los marcadores 3D del explorador.',         'system',       NULL,      NULL),
('system.lod_auto_switch',        'true',       'boolean',  'true',        'Cambio automático de LOD',          'Ajusta la resolución del modelo 3D según la distancia de la cámara.',   'system',       NULL,      NULL)

ON CONFLICT (config_key) DO NOTHING;


-- ── 3. Función helper para leer un config como integer ──────
-- Usada por el backend cuando necesita un valor numérico.
CREATE OR REPLACE FUNCTION get_config_int(p_key VARCHAR, p_default INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE v_val TEXT;
BEGIN
    SELECT config_value INTO v_val FROM system_config WHERE config_key = p_key;
    IF v_val IS NULL THEN RETURN p_default; END IF;
    RETURN v_val::INTEGER;
EXCEPTION WHEN OTHERS THEN RETURN p_default;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_config_bool(p_key VARCHAR, p_default BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
DECLARE v_val TEXT;
BEGIN
    SELECT config_value INTO v_val FROM system_config WHERE config_key = p_key;
    IF v_val IS NULL THEN RETURN p_default; END IF;
    RETURN (v_val = 'true');
EXCEPTION WHEN OTHERS THEN RETURN p_default;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_config_int  IS 'Lee un parámetro de system_config como INTEGER con fallback.';
COMMENT ON FUNCTION get_config_bool IS 'Lee un parámetro de system_config como BOOLEAN con fallback.';


-- ── 4. Verificación ─────────────────────────────────────────
DO $$
DECLARE cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt FROM system_config;
    RAISE NOTICE '============================================';
    RAISE NOTICE ' Migración 003 aplicada';
    RAISE NOTICE ' Tabla: system_config — % parámetros', cnt;
    RAISE NOTICE ' Grupos: login, session, accessibility, system';
    RAISE NOTICE ' Funciones: get_config_int, get_config_bool';
    RAISE NOTICE '============================================';
END;
$$;
