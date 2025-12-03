import axios from "axios";

/**
 * FRP Dashboard API proxy data structure
 */
export interface FrpProxy {
  name: string;
  status: "online" | "offline";
  conf: {
    remotePort: number;
  };
  todayTrafficIn: number;
  todayTrafficOut: number;
  curConns: number;
  lastStartTime: string;
  lastCloseTime: string;
}

/**
 * FRP Dashboard API response structure
 */
interface FrpProxyResponse {
  proxies: FrpProxy[];
}

/**
 * Client for interacting with FRP Dashboard API
 * Used to sync ActiveSession state with actual FRP server state
 */
export class FrpDashboardClient {
  private baseUrl: string;
  private auth: { username: string; password: string };

  constructor(
    baseUrl: string = process.env.FRP_DASHBOARD_URL || "http://frp-server:7500",
    username: string = process.env.FRP_DASHBOARD_USER || "admin",
    password: string = process.env.FRP_DASHBOARD_PASS || "admin"
  ) {
    this.baseUrl = baseUrl;
    this.auth = { username, password };
  }

  /**
   * Fetch all active proxies from FRP Dashboard
   * @returns Array of active proxy information
   */
  async getActiveProxies(): Promise<FrpProxy[]> {
    try {
      const response = await axios.get<FrpProxyResponse>(`${this.baseUrl}/api/proxy/tcp`, {
        auth: this.auth,
        timeout: 5000, // 5 second timeout
      });

      return response.data.proxies || [];
    } catch (error: any) {
      console.error("Failed to fetch FRP dashboard proxies:", error.message);

      // Log detailed error for debugging
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  URL: ${this.baseUrl}/api/proxy/tcp`);
      } else if (error.code) {
        console.error(`  Error code: ${error.code}`);
      }

      return [];
    }
  }

  /**
   * Get list of active remote ports (online proxies only)
   * @returns Array of port numbers currently active in FRP
   */
  async getActiveRemotePorts(): Promise<number[]> {
    const proxies = await this.getActiveProxies();

    return proxies
      .filter((p) => p.status === "online")
      .map((p) => p.conf.remotePort);
  }

  /**
   * Check if a specific port is currently active in FRP
   * @param port The port number to check
   * @returns True if the port is active in FRP
   */
  async isPortActive(port: number): Promise<boolean> {
    const activePorts = await this.getActiveRemotePorts();
    return activePorts.includes(port);
  }

  /**
   * Get detailed information about a specific proxy by port
   * @param port The remote port to search for
   * @returns Proxy information if found, null otherwise
   */
  async getProxyByPort(port: number): Promise<FrpProxy | null> {
    const proxies = await this.getActiveProxies();
    return proxies.find((p) => p.conf.remotePort === port) || null;
  }
}

// Export singleton instance
export const frpDashboardClient = new FrpDashboardClient();
