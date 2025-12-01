import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export interface FrpcConfig {
  serverAddr: string;
  serverPort: number;
  user: string;
  token: string;
  proxyName: string;
  proxyType: string;
  localIP: string;
  localPort: number;
  remotePort: number;
}

export class FrpcManager {
  private configDir: string;
  private binaryPath: string;
  private frpcProcess: ChildProcess | null = null;

  constructor() {
    this.configDir = path.join(__dirname, '..', 'temp');
    const ext = process.platform === 'win32' ? '.exe' : '';
    this.binaryPath = path.join(__dirname, '..', 'bin', `frpc${ext}`);
  }

  generateConfig(config: FrpcConfig): string {
    const configPath = path.join(this.configDir, 'frpc.toml');

    // Ensure temp directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const tomlContent = `
serverAddr = "${config.serverAddr}"
serverPort = ${config.serverPort}

user = "${config.user}"
metadatas.token = "${config.token}"

[[proxies]]
name = "${config.proxyName}"
type = "${config.proxyType}"
localIP = "${config.localIP}"
localPort = ${config.localPort}
remotePort = ${config.remotePort}
`;

    fs.writeFileSync(configPath, tomlContent.trim(), 'utf-8');
    console.log(`frpc config generated: ${configPath}`);

    return configPath;
  }

  startFrpc(configPath: string): void {
    if (this.frpcProcess) {
      console.log('frpc is already running');
      return;
    }

    console.log(`Starting frpc with config: ${configPath}`);
    console.log(this.binaryPath);
    this.frpcProcess = spawn(this.binaryPath, ['-c', configPath], {
      stdio: 'inherit',
    });

    this.frpcProcess.on('error', (error) => {
      console.error(`frpc process error: ${error}`);
    });

    this.frpcProcess.on('exit', (code) => {
      console.log(`frpc process exited with code ${code}`);
      this.frpcProcess = null;
    });

    console.log('frpc started successfully');
  }

  stopFrpc(): void {
    if (!this.frpcProcess) {
      console.log('frpc is not running');
      return;
    }

    console.log('Stopping frpc...');
    this.frpcProcess.kill();
    this.frpcProcess = null;
  }

  isRunning(): boolean {
    return this.frpcProcess !== null;
  }
}
