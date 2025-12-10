import jwt from 'jsonwebtoken';
import { config } from './config';
import { db } from './db';
import { JwtPayload } from './types';

export class AuthService {
  // Authenticate user with username and password
  authenticateUser(username: string, password: string): string | null {
    const user = db.getUserByUsername(username);

    if (!user) {
      console.log(`Authentication failed: User '${username}' not found`);
      return null;
    }

    // Plain text password comparison for PoC
    if (user.password !== password) {
      console.log(`Authentication failed: Invalid password for user '${username}'`);
      return null;
    }

    // Generate JWT token
    const payload: JwtPayload = {
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: parseInt(config.jwtExpiresIn),
    });

    console.log(`Authentication successful: User '${username}' logged in`);
    return token;
  }

  // Verify JWT token and return payload
  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      console.log(`Token verification failed: ${error}`);
      return null;
    }
  }
}

export const authService = new AuthService();
