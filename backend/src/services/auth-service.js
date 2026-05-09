import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { UsuarioModel } from '../models/usuario-model.js';
import { auditLog } from '../middleware/auth-middleware.js';

export class AuthService {
  static generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  static async login(email, password, req) {
    const user = await UsuarioModel.findByEmail(email);

    if (!user) {
      const err = new Error('Credenciales inválidas');
      err.statusCode = 401;
      throw err;
    }

    const isValid = await UsuarioModel.verifyPassword(password, user.password_hash);

    if (!isValid) {
      const err = new Error('Credenciales inválidas');
      err.statusCode = 401;
      throw err;
    }

    if (user.totp_secret) {
      return { requires2FA: true, userId: user.id };
    }

    const tokens = this.generateTokens(user.id);
    await UsuarioModel.updateLastLogin(user.id);

    await auditLog(req, {
      accion: 'login',
      tabla: 'usuarios',
      registro_id: user.id,
      campo: 'login'
    });

    return { tokens, user: this.sanitizeUser(user) };
  }

  static async verify2FA(userId, totpCode, req) {
    const user = await UsuarioModel.findById(userId);

    if (!user || !user.totp_secret) {
      const err = new Error('Usuario no encontrado o 2FA no habilitado');
      err.statusCode = 400;
      throw err;
    }

    const isValid = authenticator.verify({
      secret: user.totp_secret,
      token: totpCode,
      encoding: 'base32'
    });

    if (!isValid) {
      const err = new Error('Código TOTP inválido');
      err.statusCode = 401;
      throw err;
    }

    const tokens = this.generateTokens(user.id);
    await UsuarioModel.updateLastLogin(user.id);

    await auditLog(req, {
      accion: 'login_2fa',
      tabla: 'usuarios',
      registro_id: user.id,
      campo: 'login'
    });

    return { tokens, user: this.sanitizeUser(user) };
  }

  static async generate2FASecret(userId, password) {
    const user = await UsuarioModel.findById(userId);

    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const isValid = await UsuarioModel.verifyPassword(password, user.password_hash);

    if (!isValid) {
      const err = new Error('Contraseña inválida');
      err.statusCode = 401;
      throw err;
    }

    const secret = authenticator.generateSecret();
    const issuer = 'CPA';
    const label = `${issuer}:${user.email}`;

    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { secret, qrCode };
  }

  static async enable2FA(userId, password, totpCode) {
    const user = await UsuarioModel.findById(userId);

    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const isValid = await UsuarioModel.verifyPassword(password, user.password_hash);

    if (!isValid) {
      const err = new Error('Contraseña inválida');
      err.statusCode = 401;
      throw err;
    }

    const secret = authenticator.generateSecret();

    const isValidCode = authenticator.verify({
      secret,
      token: totpCode,
      encoding: 'base32'
    });

    if (!isValidCode) {
      const err = new Error('Código TOTP inválido');
      err.statusCode = 401;
      throw err;
    }

    await UsuarioModel.setTOTPSecret(userId, secret);

    return { success: true, message: '2FA habilitado correctamente' };
  }

  static async disable2FA(userId, password) {
    const user = await UsuarioModel.findById(userId);

    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const isValid = await UsuarioModel.verifyPassword(password, user.password_hash);

    if (!isValid) {
      const err = new Error('Contraseña inválida');
      err.statusCode = 401;
      throw err;
    }

    await UsuarioModel.disableTOTP(userId);

    return { success: true, message: '2FA deshabilitado correctamente' };
  }

  static async refreshTokens(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      if (decoded.type !== 'refresh') {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        throw err;
      }

      const user = await UsuarioModel.findById(decoded.userId);

      if (!user) {
        const err = new Error('User not found');
        err.statusCode = 401;
        throw err;
      }

      const tokens = this.generateTokens(user.id);

      return { tokens };
    } catch (error) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }
  }

  static sanitizeUser(user) {
    const { password_hash, totp_secret, ...sanitized } = user;
    return sanitized;
  }
}
