import express from 'express';
import { z } from 'zod';
import { authSchema, registerSchema, enable2FASchema, disable2FASchema, refreshTokenSchema } from '../schemas/auth.schema.js';
import { AuthService } from '../services/auth-service.js';
import { authMiddleware, auditLog } from '../middleware/auth-middleware.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const data = authSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password, req);

    if (result.requires2FA) {
      res.json({
        success: true,
        requires2FA: true,
        userId: result.userId
      });
    } else {
      res.json({
        success: true,
        requires2FA: false,
        ...result
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/verify-2fa', async (req, res, next) => {
  try {
    const { userId, totpCode } = req.body;

    if (!userId || !totpCode) {
      const err = new Error('userId y totpCode requeridos');
      err.statusCode = 400;
      throw err;
    }

    const result = await AuthService.verify2FA(userId, totpCode, req);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const { UsuarioModel } = await import('../models/usuario-model.js');

    const existing = await UsuarioModel.findByEmail(data.email);
    if (existing) {
      const err = new Error('Email ya registrado');
      err.statusCode = 409;
      throw err;
    }

    const user = await UsuarioModel.create(data);

    await auditLog(req, {
      accion: 'create',
      tabla: 'usuarios',
      registro_id: user.id,
      campo: 'create'
    });

    res.status(201).json({
      success: true,
      user: AuthService.sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: AuthService.sanitizeUser(req.user)
  });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const result = await AuthService.refreshTokens(data.refreshToken);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  await auditLog(req, {
    accion: 'logout',
    tabla: 'usuarios',
    registro_id: req.userId,
    campo: 'logout'
  });

  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

router.post('/2fa/generate-secret', authMiddleware, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      const err = new Error('Contraseña requerida');
      err.statusCode = 400;
      throw err;
    }

    const result = await AuthService.generate2FASecret(req.userId, password);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/2fa/enable', authMiddleware, async (req, res, next) => {
  try {
    const data = enable2FASchema.parse(req.body);
    const result = await AuthService.enable2FA(req.userId, data.password, data.totpCode);

    await auditLog(req, {
      accion: 'enable_2fa',
      tabla: 'usuarios',
      registro_id: req.userId,
      campo: 'totp_enabled'
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/2fa/disable', authMiddleware, async (req, res, next) => {
  try {
    const data = disable2FASchema.parse(req.body);
    const result = await AuthService.disable2FA(req.userId, data.password);

    await auditLog(req, {
      accion: 'disable_2fa',
      tabla: 'usuarios',
      registro_id: req.userId,
      campo: 'totp_disabled'
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
