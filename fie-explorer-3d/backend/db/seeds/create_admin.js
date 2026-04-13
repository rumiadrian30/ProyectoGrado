/**
 * FIE Explorer 3D — Seed: usuario administrador inicial
 *
 * USO:
 *   cd backend
 *   npm install
 *   cp .env.example .env   (y editar las variables)
 *   node db/seeds/create_admin.js
 *
 * El script crea un superadmin con las credenciales por defecto.
 * CAMBIA la contraseña inmediatamente después de hacer login.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'fie_explorer_3d',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const DEFAULT_ADMIN = {
  full_name: 'Administrador FIE',
  email:     'admin@espoch.edu.ec',
  password:  'FIE_Admin_2026!',   // ← cambiar en producción
  role:      'superadmin',
};

async function main() {
  console.log('🌱 Iniciando seed de usuario administrador...\n');

  const client = await pool.connect();
  try {
    // Verificar si ya existe
    const exists = await client.query(
      'SELECT id FROM admin_users WHERE email = $1',
      [DEFAULT_ADMIN.email]
    );

    if (exists.rows.length > 0) {
      console.log(`⚠️  El usuario ${DEFAULT_ADMIN.email} ya existe. Omitiendo.`);
      return;
    }

    // Hash de la contraseña
    const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);

    await client.query(
      `INSERT INTO admin_users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [DEFAULT_ADMIN.full_name, DEFAULT_ADMIN.email, hash, DEFAULT_ADMIN.role]
    );

    console.log('✅ Usuario administrador creado exitosamente:');
    console.log(`   Email    : ${DEFAULT_ADMIN.email}`);
    console.log(`   Password : ${DEFAULT_ADMIN.password}`);
    console.log(`   Rol      : ${DEFAULT_ADMIN.role}`);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña al hacer tu primer login.\n');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
