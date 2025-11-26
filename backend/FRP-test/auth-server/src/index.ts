import express, { Request, Response } from 'express';
import path from 'path';
import { config } from './config';
import { authService } from './auth';
import { db } from './db';
import { LoginRequest, LoginResponse, FrpWebhookRequest, FrpWebhookResponse } from './types';
import { FrpBinarySetup } from './frpSetup';

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'FRP Auth Server' });
});

// Login API for clients
app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body as LoginRequest;

  if (!username || !password) {
    const response: LoginResponse = {
      success: false,
      message: 'Username and password are required',
    };
    return res.status(400).json(response);
  }

  const token = authService.authenticateUser(username, password);

  if (!token) {
    const response: LoginResponse = {
      success: false,
      message: 'Invalid username or password',
    };
    return res.status(401).json(response);
  }

  const response: LoginResponse = {
    success: true,
    token,
  };

  res.json(response);
});

// Webhook handler for FRP
app.post('/webhook/handler', (req: Request, res: Response) => {
  const webhookReq = req.body as FrpWebhookRequest;

  console.log(`Webhook received: op=${webhookReq.op}`);

  if (webhookReq.op === 'Login') {
    handleLogin(webhookReq, res);
  } else if (webhookReq.op === 'NewProxy') {
    handleNewProxy(webhookReq, res);
  } else if (webhookReq.op === 'Ping') {
    // Simple ping response
    const response: FrpWebhookResponse = {
      reject: false,
      unchange: true,
    };
    res.json(response);
  } else {
    // Unknown operation
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: 'Unknown operation',
    };
    res.json(response);
  }
});

function handleLogin(webhookReq: FrpWebhookRequest, res: Response): void {
  const token = webhookReq.content.metas?.token;
  if (!token) {
    console.log('Login rejected: No token provided');
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: 'No token provided',
    };
    res.json(response);
    return;
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    console.log('Login rejected: Invalid or expired token');
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: 'Invalid or expired token',
    };
    res.json(response);
    return;
  }

  console.log(`Login accepted: User '${payload.username}'`);
  const response: FrpWebhookResponse = {
    reject: false,
    unchange: true,
  };
  res.json(response);
}

function handleNewProxy(webhookReq: FrpWebhookRequest, res: Response): void {
  const token = webhookReq.content.user?.metas?.token;
  const remotePort = webhookReq.content.remote_port;

  if (!token) {
    console.log('NewProxy rejected: No token provided');
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: 'No token provided',
    };
    res.json(response);
    return;
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    console.log('NewProxy rejected: Invalid or expired token');
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: 'Invalid or expired token',
    };
    res.json(response);
    return;
  }

  if (!remotePort) {
    console.log('NewProxy rejected: No remote port specified');
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: 'No remote port specified',
    };
    res.json(response);
    return;
  }

  // Check if user is allowed to use this port
  const isAllowed = db.isPortAllowedForUser(payload.username, remotePort)

  if (!isAllowed) {
    console.log(`NewProxy rejected: Port ${remotePort} not allowed for user '${payload.username}'`);
    const response: FrpWebhookResponse = {
      reject: true,
      reject_reason: `Port ${remotePort} not allowed for this user`,
    };
    res.json(response);
    return;
  }
  console.log(webhookReq);
  console.log(`NewProxy accepted: User '${payload.username}', Port ${remotePort}`);
  const response: FrpWebhookResponse = {
    reject: false,
    unchange: true,
  };
  res.json(response);
}

// Initialize and start server
async function main() {
  try {
    // Ensure frps binary exists
    const frpsDir = path.join(__dirname, '..', '..', 'frps');
    const frpSetup = new FrpBinarySetup(frpsDir, 'frps');
    await frpSetup.ensureBinaryExists();

    // Start Express server
    app.listen(config.port, () => {
      console.log(`FRP Auth Server running on port ${config.port}`);
      console.log(`JWT Secret: ${config.jwtSecret}`);
      console.log(`Database: ${config.dbPath}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
