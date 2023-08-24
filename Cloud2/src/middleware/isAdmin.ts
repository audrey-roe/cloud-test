import {Response, Request, NextFunction} from 'express'
function isAdmin(req: Request, res: Response, next: NextFunction) {
    const user = res.locals.user;
  
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(403).json({ error: 'Unauthorized: Only admins can perform this action' });
    }
  }
  
export default isAdmin;