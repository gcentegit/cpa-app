import pg from 'pg';
import bcrypt from 'bcrypt';
import { authSchema, registerSchema, enable2FASchema } from '../schemas/auth.schema.js';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class UsuarioModel {
  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, r.codigo as rol_codigo, r.nombre as rol_nombre, p.modulo, p.accion, p.permitido
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       LEFT JOIN permisos p ON r.id = p.rol_id
       WHERE u.email = $1 AND u.activo = true`,
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT u.*, r.codigo as rol_codigo, r.nombre as rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1 AND u.activo = true`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellidos, rol_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, nombre, apellidos, rol_id, activo, created_at`,
      [data.email, hashedPassword, data.nombre, data.apellidos, data.rol_id]
    );
    return result.rows[0];
  }

  static async updateLastLogin(userId) {
    await pool.query(
      'UPDATE usuarios SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  }

  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static async setTOTPSecret(userId, secret) {
    await pool.query(
      'UPDATE usuarios SET totp_secret = $1 WHERE id = $2',
      [secret, userId]
    );
  }

  static async disableTOTP(userId) {
    await pool.query(
      'UPDATE usuarios SET totp_secret = NULL WHERE id = $1',
      [userId]
    );
  }
}
