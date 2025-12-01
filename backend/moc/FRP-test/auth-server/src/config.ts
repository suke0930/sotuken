import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '3600',
  port: parseInt(process.env.PORT || '3000'),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'users.json'),
};
