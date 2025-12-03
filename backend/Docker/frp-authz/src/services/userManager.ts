import fs from "fs/promises";
import path from "path";
import { watch as fsWatch } from "fs";
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

      // Watch for file changes using fs.watch (real-time monitoring)
      this.watchFileChanges();

      // Fallback: Also check periodically (every 60 seconds) in case fs.watch fails
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

  /**
   * Watch for real-time file changes using fs.watch
   */
  private watchFileChanges(): void {
    try {
      fsWatch(this.filePath, { persistent: true }, async (eventType: string, filename: string) => {
        if (eventType === 'change') {
          console.log(`Users file changed (fs.watch event), reloading...`);
          // Add a small delay to ensure file write is complete
          setTimeout(async () => {
            try {
              await this.loadFromFile();
            } catch (error) {
              console.error("Error reloading users file:", error);
            }
          }, 500);
        }
      });

      console.log(`Real-time file monitoring enabled for ${this.filePath}`);
    } catch (error) {
      console.error("Failed to setup fs.watch, falling back to polling:", error);
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

  /**
   * Get user permissions (for internal API)
   */
  async getUserPermissions(discordId: string): Promise<{ allowedPorts: number[]; maxSessions: number } | null> {
    const user = this.getUser(discordId);
    
    if (!user) {
      return null;
    }

    return {
      allowedPorts: user.allowedPorts,
      maxSessions: user.maxSessions,
    };
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
