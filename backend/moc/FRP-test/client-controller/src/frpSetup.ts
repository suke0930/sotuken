import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import extract from 'extract-zip';
import * as tar from 'tar';

interface FrpConfig {
  win: string;
  mac: string;
  linux: string;
}

export class FrpBinarySetup {
  private configPath: string;
  private targetDir: string;
  private binaryName: string;

  constructor(targetDir: string, binaryName: 'frps' | 'frpc') {
    this.configPath = path.join(__dirname, '..', '..', 'config.json');
    this.targetDir = targetDir;
    this.binaryName = binaryName;
  }

  async ensureBinaryExists(): Promise<void> {
    const binaryPath = this.getBinaryPath();

    if (fs.existsSync(binaryPath)) {
      console.log(`${this.binaryName} binary already exists at ${binaryPath}`);
      return;
    }

    console.log(`${this.binaryName} binary not found. Starting download...`);
    await this.downloadAndExtract();
  }

  private getBinaryPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.targetDir, `${this.binaryName}${ext}`);
  }

  private async downloadAndExtract(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`config.json not found at ${this.configPath}. Please create it with FRP download URLs.`);
    }

    const config: FrpConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    const downloadUrl = this.getDownloadUrl(config);

    console.log(`Downloading from: ${downloadUrl}`);

    const tempDir = path.join(this.targetDir, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = path.basename(downloadUrl);
    const tempFile = path.join(tempDir, fileName);

    await this.downloadFile(downloadUrl, tempFile);
    console.log(`Download completed: ${tempFile}`);

    await this.extractBinary(tempFile, tempDir);

    // Clean up
    fs.unlinkSync(tempFile);
    console.log(`${this.binaryName} binary setup completed`);
  }

  private getDownloadUrl(config: FrpConfig): string {
    switch (process.platform) {
      case 'win32':
        return config.win;
      case 'darwin':
        return config.mac;
      case 'linux':
        return config.linux;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  private downloadFile(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const file = fs.createWriteStream(destination);

      const request = protocol.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect - close the file stream first
          file.close();
          if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
          }
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error('Redirect without location header'));
            return;
          }
          this.downloadFile(redirectUrl, destination).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
          }
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            // Wait for file to be fully closed before resolving
            resolve();
          });
        });

        file.on('error', (err) => {
          file.close();
          if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
          }
          reject(err);
        });
      });

      request.on('error', (err) => {
        file.close();
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }
        reject(err);
      });
    });
  }

  private async extractBinary(archivePath: string, tempDir: string): Promise<void> {
    const isZip = archivePath.endsWith('.zip');
    const isTarGz = archivePath.endsWith('.tar.gz');

    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir, { recursive: true });
    }

    console.log(`Extracting archive: ${archivePath}`);

    if (isZip) {
      // Windows - use extract-zip library
      await extract(archivePath, { dir: tempDir });
    } else if (isTarGz) {
      // Mac/Linux - use tar library
      await tar.x({
        file: archivePath,
        cwd: tempDir,
      });
    } else {
      throw new Error('Unsupported archive format');
    }

    console.log('Archive extracted successfully');

    // Find and move the binary
    const extractedDir = fs.readdirSync(tempDir).find(f => f.startsWith('frp_'));
    if (!extractedDir) {
      throw new Error('Extracted directory not found');
    }

    const ext = process.platform === 'win32' ? '.exe' : '';
    const binarySource = path.join(tempDir, extractedDir, `${this.binaryName}${ext}`);
    const binaryDest = this.getBinaryPath();

    if (!fs.existsSync(binarySource)) {
      throw new Error(`Binary not found in extracted files: ${binarySource}`);
    }

    console.log(`Copying binary from ${binarySource} to ${binaryDest}`);
    fs.copyFileSync(binarySource, binaryDest);

    // Make executable on Unix-like systems
    if (process.platform !== 'win32') {
      fs.chmodSync(binaryDest, 0o755);
    }

    // Clean up extracted directory
    console.log(`Cleaning up temporary files`);
    fs.rmSync(path.join(tempDir, extractedDir), { recursive: true, force: true });
  }
}
