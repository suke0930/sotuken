import path from 'path';
import { AuthApiClient } from './api';
import { FrpcManager, FrpcConfig } from './frp';
import { FrpBinarySetup } from './frpSetup';

interface CliArgs {
  username: string;
  password: string;
  serverAddr: string;
  serverPort: number;
  authServerUrl: string;
  localPort: number;
  remotePort: number;
}

function parseArgs(): CliArgs | null {
  const args = process.argv.slice(2);

  if (args.length < 7) {
    console.log('Usage: node index.js <username> <password> <serverAddr> <serverPort> <authServerUrl> <localPort> <remotePort>');
    console.log('');
    console.log('Example:');
    console.log('  node index.js user_alpha password123 127.0.0.1 7000 http://127.0.0.1:3000 22 2222');
    console.log('');
    console.log('Arguments:');
    console.log('  username        - Username for authentication');
    console.log('  password        - Password for authentication');
    console.log('  serverAddr      - FRP server address');
    console.log('  serverPort      - FRP server port');
    console.log('  authServerUrl   - Authentication server URL');
    console.log('  localPort       - Local port to forward');
    console.log('  remotePort      - Remote port on FRP server');
    return null;
  }

  return {
    username: args[0],
    password: args[1],
    serverAddr: args[2],
    serverPort: parseInt(args[3]),
    authServerUrl: args[4],
    localPort: parseInt(args[5]),
    remotePort: parseInt(args[6]),
  };
}

async function main() {
  console.log('=== FRP Client Controller ===\n');

  // Parse command line arguments
  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  try {
    // Step 1: Ensure frpc binary exists
    console.log('[1/4] Checking frpc binary...');
    const frpcBinDir = path.join(__dirname, '..', 'bin');
    const frpSetup = new FrpBinarySetup(frpcBinDir, 'frpc');
    await frpSetup.ensureBinaryExists();

    // Step 2: Authenticate and get JWT token
    console.log('\n[2/4] Authenticating with auth server...');
    const apiClient = new AuthApiClient(args.authServerUrl);
    const token = await apiClient.login(args.username, args.password);

    if (!token) {
      console.error('Authentication failed. Exiting.');
      process.exit(1);
    }

    // Step 3: Generate frpc configuration
    console.log('\n[3/4] Generating frpc configuration...');
    const frpcManager = new FrpcManager();

    const frpcConfig: FrpcConfig = {
      serverAddr: args.serverAddr,
      serverPort: args.serverPort,
      user: args.username,
      token: token,
      proxyName: `${args.username}-tunnel`,
      proxyType: 'tcp',
      localIP: '127.0.0.1',
      localPort: args.localPort,
      remotePort: args.remotePort,
    };

    const configPath = frpcManager.generateConfig(frpcConfig);

    // Step 4: Start frpc
    console.log('\n[4/4] Starting frpc...');
    frpcManager.startFrpc(configPath);

    console.log('\n=== FRP Client is running ===');
    console.log(`Local port ${args.localPort} is forwarded to remote port ${args.remotePort}`);
    console.log('Press Ctrl+C to stop\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      frpcManager.stopFrpc();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
