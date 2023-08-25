import { Response, Request, NextFunction } from 'express'
import { getUserFromDatabase } from '../controller/user.controller';

async function isAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = res.locals.userId;
  const user = await getUserFromDatabase(userId)

  if (user && user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized: Only admins can perform this action' });
  }
}

export default isAdmin;