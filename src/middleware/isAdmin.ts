import { Response, Request, NextFunction } from 'express'
import { getUserFromDatabase } from '../controller/user.controller';

// Middleware that verifies that a user is an administrator, used on admin only features

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