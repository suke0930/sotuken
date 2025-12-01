import fetch from 'node-fetch';

interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export class AuthApiClient {
  private baseUrl: string;

  constructor(authServerUrl: string) {
    this.baseUrl = authServerUrl;
  }

  async login(username: string, password: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json() as LoginResponse;

      if (!data.success || !data.token) {
        console.error(`Login failed: ${data.message}`);
        return null;
      }

      console.log('Login successful, JWT token received');
      return data.token;
    } catch (error) {
      console.error(`Login request failed: ${error}`);
      return null;
    }
  }
}
