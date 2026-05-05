// db/seed-admin.js
// Crea el primer usuario administrador en la base de datos.
// Ejecutar UNA SOLA VEZ: npm run seed
// ============================================================
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./pool');

const ADMIN = {
  full_name: 'Administrador FIE',
  email:     'admin@espoch.edu.ec',
  password:  'Admin$2026!',       // ← cambiar en producción
  role:      'superadmin',
};

async function seed() {
  console.log('🌱  Creando usuario admin...');

  // Hashear la contraseña con factor 12 (recomendado en el SRS)
  const password_hash = await bcrypt.hash(ADMIN.password, 12);

  const sql = `
    INSERT INTO admin_users (full_name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE
      SET full_name     = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role          = EXCLUDED.role,
          updated_at    = NOW()
    RETURNING id, email, role;
  `;

  try {
    const { rows } = await pool.query(sql, [
      ADMIN.full_name,
      ADMIN.email,
      password_hash,
      ADMIN.role,
    ]);
    console.log('✅  Usuario creado/actualizado:');
    console.log('    ID   :', rows[0].id);
    console.log('    Email:', rows[0].email);
    console.log('    Rol  :', rows[0].role);
    console.log('    Pass :', ADMIN.password, '(texto plano — solo para pruebas)');
  } catch (err) {
    console.error('❌  Error al crear el usuario:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
