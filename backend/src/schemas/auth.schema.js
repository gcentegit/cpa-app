import { z } from 'zod';

export const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  totpCode: z.string().length(6).optional()
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(2, 'Nombre requerido'),
  apellidos: z.string().min(2, 'Apellidos requeridos'),
  rol_id: z.number().int().positive()
});

export const enable2FASchema = z.object({
  password: z.string().min(6, 'Contraseña requerida'),
  totpCode: z.string().length(6, 'Código TOTP inválido')
});

export const disable2FASchema = z.object({
  password: z.string().min(6, 'Contraseña requerida')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
});
