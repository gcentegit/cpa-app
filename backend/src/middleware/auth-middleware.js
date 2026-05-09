import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      const err = new Error('No token provided');
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT u.*, r.codigo as rol_codigo, r.nombre as rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1 AND u.activo = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      const err = new Error('User not found or inactive');
      err.statusCode = 401;
      throw err;
    }

    req.user = result.rows[0];
    req.userId = result.rows[0].id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Invalid token');
      err.statusCode = 401;
      return next(err);
    }
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token expired');
      err.statusCode = 401;
      return next(err);
    }
    next(error);
  }
}

export function can(accion) {
  return async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT permitido FROM permisos
         WHERE rol_id = $1 AND modulo = $2 AND accion = $3`,
        [req.user.rol_id, accion.modulo, accion.accion]
      );

      if (result.rows.length === 0 || !result.rows[0].permitido) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function auditLog(req, accion, datos = {}) {
  try {
    const userId = req.userId || 'anonymous';
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    await pool.query(
      `INSERT INTO audit_log (tabla, registro_id, campo, valor_anterior, valor_nuevo, usuario_id, ip, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        accion.tabla || 'system',
        accion.registro_id || null,
        accion.campo || accion.accion,
        JSON.stringify(datos.anterior) || null,
        JSON.stringify(datos.nuevo) || null,
        userId,
        ip,
        new Date().toISOString()
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
