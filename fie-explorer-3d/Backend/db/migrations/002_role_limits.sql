-- ============================================================
--  FIE Admin — Migración 002: Límites de roles y trigger
--  Ejecutar en pgAdmin 4 → Query Tool sobre fie_explorer_3d
-- ============================================================

-- ── 1. Tabla role_limits ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_limits (
    id          SERIAL       PRIMARY KEY,
    role_name   VARCHAR(20)  NOT NULL UNIQUE,
    max_count   INTEGER      NOT NULL DEFAULT 1,
    updated_by  UUID         REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_role_limits_role  CHECK (role_name IN ('admin', 'superadmin')),
    CONSTRAINT chk_role_limits_max   CHECK (max_count >= 1 AND max_count <= 20)
);

COMMENT ON TABLE  role_limits           IS 'Límites máximos de usuarios activos por rol.';
COMMENT ON COLUMN role_limits.max_count IS 'Número máximo de usuarios activos permitidos con este rol.';

-- Valores por defecto
INSERT INTO role_limits (role_name, max_count) VALUES
    ('superadmin', 2),
    ('admin',      10)
ON CONFLICT (role_name) DO NOTHING;

-- Trigger updated_at
CREATE TRIGGER trg_role_limits_updated_at
    BEFORE UPDATE ON role_limits
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ── 2. Función del trigger de validación ────────────────────
CREATE OR REPLACE FUNCTION fn_check_role_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_max     INTEGER;
    v_current INTEGER;
BEGIN
    -- Si el usuario queda inactivo, siempre permitir
    IF NEW.is_active = FALSE THEN
        RETURN NEW;
    END IF;

    -- En UPDATE: si no cambia rol ni estado activo, omitir
    IF TG_OP = 'UPDATE' THEN
        IF OLD.role = NEW.role AND OLD.is_active = NEW.is_active THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Leer límite configurado
    SELECT max_count INTO v_max
    FROM role_limits WHERE role_name = NEW.role;

    IF v_max IS NULL THEN RETURN NEW; END IF;

    -- Contar activos actuales (excluir el propio registro en UPDATE)
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO v_current
        FROM admin_users
        WHERE role = NEW.role AND is_active = TRUE;
    ELSE
        SELECT COUNT(*) INTO v_current
        FROM admin_users
        WHERE role = NEW.role AND is_active = TRUE AND id <> OLD.id;
    END IF;

    IF v_current >= v_max THEN
        RAISE EXCEPTION
            'Límite alcanzado: el rol "%" permite máximo % usuario(s) activo(s). Hay % actualmente.',
            NEW.role, v_max, v_current
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_check_role_limit() IS
    'Bloquea INSERT/UPDATE en admin_users que superen el límite de role_limits.';

-- ── 3. Trigger sobre admin_users ────────────────────────────
DROP TRIGGER IF EXISTS trg_check_role_limit ON admin_users;
CREATE TRIGGER trg_check_role_limit
    BEFORE INSERT OR UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION fn_check_role_limit();

-- ── 4. Verificación ─────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE ' Migración 002 aplicada';
    RAISE NOTICE ' Tabla  : role_limits';
    RAISE NOTICE ' Trigger: trg_check_role_limit en admin_users';
    RAISE NOTICE ' Límites: superadmin ≤ 2 | admin ≤ 10';
    RAISE NOTICE '============================================';
END;
$$;
