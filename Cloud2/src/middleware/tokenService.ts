import jwt from 'jsonwebtoken';

export function generateToken(userId: string | number): string {
  if (!process.env.jwtSecret) {
    throw new Error('JWT secret is not configured.');
  }
  return jwt.sign({ userId }, process.env.jwtSecret, { expiresIn: '2h' });
}
