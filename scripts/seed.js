import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('🌱 Iniciando seed de CPA...');

  try {
    await pool.query('BEGIN');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const itRole = await pool.query("SELECT id FROM roles WHERE codigo = 'IT'");

    if (itRole.rows.length === 0) {
      throw new Error('Rol IT no encontrado. Ejecuta primero el schema SQL.');
    }

    const existingAdmin = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@cpa.local'");

    if (existingAdmin.rows.length === 0) {
      await pool.query(
        `INSERT INTO usuarios (email, password_hash, nombre, apellidos, rol_id, activo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, nombre`,
        ['admin@cpa.local', hashedPassword, 'Administrador', 'CPA', itRole.rows[0].id, true]
      );
      console.log('✅ Usuario admin creado: admin@cpa.local / admin123');
    } else {
      console.log('ℹ️ Usuario admin ya existe');
    }

    await pool.query('COMMIT');
    console.log('🎉 Seed completado exitosamente');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error en seed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
