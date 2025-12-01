// User data structure
export interface User {
  username: string;
  password: string;  // Plain text for PoC
  allowedPorts: number[];
  role: string;
}

export interface UsersDatabase {
  users: User[];
}

// JWT Payload
export interface JwtPayload {
  username: string;
  role: string;
}

// API Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

// FRP Webhook types
export interface FrpWebhookRequest {
  version: string;
  op: 'Login' | 'NewProxy' | 'Ping';
  content: {
    user?: {
      user: string;
      metas?: { [key: string]: string };
      run_id?: string;
    };
    proxy_name?: string;
    proxy_type?: string;
    remote_port?: number;
    [key: string]: any;
  };
}

export interface FrpWebhookResponse {
  reject: boolean;
  reject_reason?: string;
  unchange?: boolean;
  content?: any;
}
