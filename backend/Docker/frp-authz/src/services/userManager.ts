import fs from "fs/promises";
import path from "path";
import { User, UserStore } from "../types/frp.js";
import { env } from "../types/env.js";

export class UserManager {
  private users: Map<string, User> = new Map();
  private filePath: string;
  private lastModified: number = 0;

  constructor(dataDir: string = env.DATA_DIR) {
    this.filePath = path.join(dataDir, "users.json");
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      // Load users from file
      await this.loadFromFile();
      
      // Watch for file changes (reload every 60 seconds)
      setInterval(() => {
        this.reloadIfChanged();
      }, 60 * 1000);
      
      console.log(`UserManager initialized (${this.users.size} users loaded)`);
    } catch (error) {
      console.error("Failed to initialize UserManager:", error);
      // Initialize with empty users
      this.users = new Map();
    }
  }

  getUser(discordId: string): User | null {
    return this.users.get(discordId) || null;
  }

  isPortAllowed(discordId: string, port: number): boolean {
    const user = this.getUser(discordId);
    
    if (!user) {
      console.log(`User not found: ${discordId}`);
      return false;
    }

    return user.allowedPorts.includes(port);
  }

  getMaxSessions(discordId: string): number {
    const user = this.getUser(discordId);
    return user?.maxSessions || 0;
  }

  private async loadFromFile(): Promise<void> {
    try {
      const stats = await fs.stat(this.filePath);
      this.lastModified = stats.mtimeMs;
      
      const data = await fs.readFile(this.filePath, "utf-8");
      const store: UserStore = JSON.parse(data);
      
      this.users.clear();
      for (const user of store.users) {
        this.users.set(user.discordId, user);
      }
      
      console.log(`Loaded ${this.users.size} users from file`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("Users file not found, creating default users.json");
        await this.createDefaultUsersFile();
        await this.loadFromFile();
      } else {
        throw error;
      }
    }
  }

  private async reloadIfChanged(): Promise<void> {
    try {
      const stats = await fs.stat(this.filePath);
      
      if (stats.mtimeMs > this.lastModified) {
        console.log("Users file changed, reloading...");
        await this.loadFromFile();
      }
    } catch (error) {
      console.error("Failed to check users file for changes:", error);
    }
  }

  private async createDefaultUsersFile(): Promise<void> {
    const defaultStore: UserStore = {
      users: [
        {
          discordId: "example-discord-id-123",
          allowedPorts: [25565, 22, 3000, 8080],
          maxSessions: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    await fs.writeFile(
      this.filePath,
      JSON.stringify(defaultStore, null, 2),
      "utf-8"
    );
    
    console.log("Created default users.json file");
  }
}

export const userManager = new UserManager();
