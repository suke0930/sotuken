import * as fs from 'fs';
import { config } from './config';
import { UsersDatabase, User } from './types';

export class Database {
  // Always reload users.json from disk on each call
  private loadUsers(): UsersDatabase {
    const data = fs.readFileSync(config.dbPath, 'utf-8');
    return JSON.parse(data);
  }

  getUserByUsername(username: string): User | undefined {
    const db = this.loadUsers();
    return db.users.find(u => u.username === username);
  }

  getAllUsers(): User[] {
    const db = this.loadUsers();
    return db.users;
  }

  isPortAllowedForUser(username: string, port: number): boolean {
    const user = this.getUserByUsername(username);
    if (!user) {
      return false;
    }
    return user.allowedPorts.includes(port);
  }
}

export const db = new Database();
