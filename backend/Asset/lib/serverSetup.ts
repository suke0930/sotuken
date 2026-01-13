import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { ServerSchema } from "../types/server.types";

const execAsync = promisify(exec);

function getBaseUrl(): string {
  const baseUrlFromEnv =
    process.env.ASSET_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.EXTERNAL_BASE_URL ||
    process.env.BASE_URL;

  if (baseUrlFromEnv) {
    return baseUrlFromEnv.replace(/\/$/, "");
  }

  const port = Number(process.env.ASSET_PORT || process.env.PORT) || 3000;
  const host = process.env.ASSET_HOST || process.env.HOST || "localhost";
  const protocol = process.env.ASSET_PROTOCOL || process.env.PROTOCOL || "http";

  return `${protocol}://${host}:${port}`.replace(/\/$/, "");
}

/**
 * Server_JSON_Generatorのmain.jsを実行してlatest-servers.jsonを生成
 */
export async function runServerGenerator(): Promise<void> {
  const generatorPath = path.join(__dirname, "..", "Server_JSON_Genelator");
  const mainJs = path.join(generatorPath, "main.js");

  if (!fs.existsSync(mainJs)) {
    throw new Error(`Server_JSON_Generator not found at ${mainJs}`);
  }

  console.log("🔄 Running Server_JSON_Generator...");

  try {
    const { stdout, stderr } = await execAsync(`node "${mainJs}"`, {
      cwd: generatorPath,
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log("✅ Server_JSON_Generator completed successfully");
  } catch (error: any) {
    console.error("❌ Failed to run Server_JSON_Generator:", error.message);
    throw error;
  }
}

/**
 * latest-servers.jsonをdata/servers.json形式に変換
 */
export async function convertLatestServersToSchema(
  latestServersPath: string,
  baseUrl?: string
): Promise<ServerSchema> {
  const resolvedBaseUrl = (baseUrl || getBaseUrl()).replace(/\/$/, "");
  if (!fs.existsSync(latestServersPath)) {
    throw new Error(`latest-servers.json not found at ${latestServersPath}`);
  }

  const rawData = fs.readFileSync(latestServersPath, "utf-8");
  const latestServers: ServerSchema = JSON.parse(rawData);

  const serverSchema: ServerSchema = [];

  for (const server of latestServers) {
    const versions = [];

    for (const versionInfo of server.versions) {
      // リモートURLからファイル名を抽出
      const urlObj = new URL(versionInfo.downloadUrl);
      const pathParts = urlObj.pathname.split('/');
      let filename = pathParts[pathParts.length - 1];

      // Fabricの場合、ファイル名が"jar"なので適切な名前に変更
      // Vanillaの場合、ファイル名が"server.jar"なので適切な名前に変更
      if (!filename.includes('.jar') || filename === 'jar' || filename === 'server.jar') {
        filename = `${server.name.toLowerCase()}-${versionInfo.version}-server.jar`;
      }

      // localhost URLに変換
      const localUrl = `${resolvedBaseUrl}/api/assets/servers/${server.name.toLowerCase()}/${filename}`;

      versions.push({
        version: versionInfo.version,
        jdk: versionInfo.jdk,
        downloadUrl: localUrl,
      });
    }

    serverSchema.push({
      name: server.name,
      versions: versions,
    });
  }

  return serverSchema;
}

/**
 * servers.jsonを更新
 */
export async function updateServersJson(
  serverSchema: ServerSchema,
  serversJsonPath: string
): Promise<void> {
  const jsonContent = JSON.stringify(serverSchema, null, 2);
  fs.writeFileSync(serversJsonPath, jsonContent, "utf-8");
  console.log(`✅ Updated ${serversJsonPath}`);
}

/**
 * HTTPSでファイルをダウンロード
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // リダイレクト処理
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }

      const totalSize = parseInt(response.headers["content-length"] || "0", 10);
      let downloadedSize = 0;
      let lastLoggedPercent = 0;

      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);

        // 10%刻みでログ出力
        if (percent >= lastLoggedPercent + 10) {
          console.log(`   Progress: ${percent}%`);
          lastLoggedPercent = percent;
        }
      });

      response.pipe(file);

      file.on("finish", () => {
        file.close();
        console.log(`   ✅ Download completed`);
        resolve();
      });
    }).on("error", (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

/**
 * Minecraftサーバーバイナリをダウンロード
 */
export async function downloadServerBinaries(
  latestServersPath: string,
  resourcesDir: string
): Promise<void> {
  if (!fs.existsSync(latestServersPath)) {
    throw new Error(`latest-servers.json not found at ${latestServersPath}`);
  }

  const rawData = fs.readFileSync(latestServersPath, "utf-8");
  const latestServers: ServerSchema = JSON.parse(rawData);

  console.log("🔄 Checking and downloading server binaries...");

  for (const server of latestServers) {
    console.log(`\n📦 Processing ${server.name}...`);

    for (const versionInfo of server.versions) {
      const url = versionInfo.downloadUrl;

      // ファイル名の決定
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      let filename = pathParts[pathParts.length - 1];

      // Fabricの場合、ファイル名が"jar"なので適切な名前に変更
      // Vanillaの場合、ファイル名が"server.jar"なので適切な名前に変更
      if (!filename.includes('.jar') || filename === 'jar' || filename === 'server.jar') {
        filename = `${server.name.toLowerCase()}-${versionInfo.version}-server.jar`;
      }

      const destDir = path.join(resourcesDir, "servers", server.name.toLowerCase());
      const destPath = path.join(destDir, filename);

      // ファイルが既に存在する場合はスキップ
      if (fs.existsSync(destPath)) {
        console.log(`   ⏭️  Skipping ${filename} (already exists)`);
        continue;
      }

      // ディレクトリ作成
      fs.mkdirSync(destDir, { recursive: true });

      console.log(`   ⬇️  Downloading ${filename}...`);
      try {
        await downloadFile(url, destPath);
      } catch (error: any) {
        console.error(`   ❌ Failed to download ${filename}:`, error.message);
      }
    }
  }

  console.log("\n✅ Server binary check and download completed");
}

/**
 * Minecraftサーバー自動セットアップのメイン処理
 */
export async function setupServers(baseUrl?: string): Promise<void> {
  const resolvedBaseUrl = (baseUrl || getBaseUrl()).replace(/\/$/, "");
  const rootDir = path.join(__dirname, "..");
  const generatorDir = path.join(rootDir, "Server_JSON_Genelator");
  const latestServersPath = path.join(generatorDir, "latest-servers.json");
  const serversJsonPath = path.join(rootDir, "data", "servers.json");
  const resourcesDir = path.join(rootDir, "resources");

  console.log("\n========================================");
  console.log("🚀 Starting Minecraft Server Auto Setup");
  console.log("========================================\n");

  try {
    // 1. Server_JSON_Generatorを実行
    await runServerGenerator();

    // 2. latest-servers.jsonをservers.json形式に変換
    console.log("\n🔄 Converting latest-servers.json to servers.json format...");
    const serverSchema = await convertLatestServersToSchema(latestServersPath, resolvedBaseUrl);

    // 3. servers.jsonを更新
    await updateServersJson(serverSchema, serversJsonPath);

    // 4. サーバーバイナリをダウンロード
    await downloadServerBinaries(latestServersPath, resourcesDir);

    console.log("\n========================================");
    console.log("✅ Minecraft Server Auto Setup Completed Successfully");
    console.log("========================================\n");
  } catch (error: any) {
    console.error("\n========================================");
    console.error("❌ Minecraft Server Auto Setup Failed");
    console.error("========================================");
    console.error(error.message);
    throw error;
  }
}
