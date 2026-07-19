import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Adjuntar usuario autenticado a la petición
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
}
