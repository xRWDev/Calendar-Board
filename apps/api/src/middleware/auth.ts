import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  sub: string;
  username: string;
  role?: 'user' | 'admin';
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT secret is not configured' });
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = { id: payload.sub, username: payload.username, role: payload.role ?? 'user' };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
