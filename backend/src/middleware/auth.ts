import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { id: string; username: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
}
