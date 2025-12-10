import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { JDKSchema } from "../types/jdk.types";

const execAsync = promisify(exec);

function getBaseUrl(): string {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "localhost";
  const protocol = process.env.PROTOCOL || "http";
  return (process.env.BASE_URL || `${protocol}://${host}:${port}`).replace(/\/$/, "");
}

/**
 * JDK_JSON_Generatorのmain.jsを実行してlatest-jdks.jsonを生成
 */
export async function runJDKGenerator(): Promise<void> {
  const generatorPath = path.join(__dirname, "..", "JDK_JSON_Genelator");
  const mainJs = path.join(generatorPath, "main.js");

  if (!fs.existsSync(mainJs)) {
    throw new Error(`JDK_JSON_Generator not found at ${mainJs}`);
  }

  console.log("🔄 Running JDK_JSON_Generator...");

  try {
    const { stdout, stderr } = await execAsync(`node "${mainJs}"`, {
      cwd: generatorPath,
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log("✅ JDK_JSON_Generator completed successfully");
  } catch (error: any) {
    console.error("❌ Failed to run JDK_JSON_Generator:", error.message);
    throw error;
  }
}

/**
 * latest-jdks.jsonの形式
 */
interface LatestJDKEntry {
  version: number;
  links: {
    win?: string;
    linux?: string;
    mac?: string;
  };
}

/**
 * latest-jdks.jsonをdata/jdk.json形式に変換
 */
export async function convertLatestJDKsToSchema(
  latestJdksPath: string,
  baseUrl?: string
): Promise<JDKSchema> {
  const resolvedBaseUrl = (baseUrl || getBaseUrl()).replace(/\/$/, "");
  if (!fs.existsSync(latestJdksPath)) {
    throw new Error(`latest-jdks.json not found at ${latestJdksPath}`);
  }

  const rawData = fs.readFileSync(latestJdksPath, "utf-8");
  const latestJdks: LatestJDKEntry[] = JSON.parse(rawData);

  const jdkSchema: JDKSchema = [];

  for (const entry of latestJdks) {
    const version = entry.version.toString();
    const downloads = [];

    // Windows
    if (entry.links.win) {
      const filename = path.basename(entry.links.win);
      downloads.push({
        os: "windows" as const,
        downloadUrl: `${resolvedBaseUrl}/api/assets/jdk/${version}/windows/${filename}`,
      });
    }

    // Linux
    if (entry.links.linux) {
      const filename = path.basename(entry.links.linux);
      downloads.push({
        os: "linux" as const,
        downloadUrl: `${resolvedBaseUrl}/api/assets/jdk/${version}/linux/${filename}`,
      });
    }

    // macOS
    if (entry.links.mac) {
      const filename = path.basename(entry.links.mac);
      downloads.push({
        os: "macos" as const,
        downloadUrl: `${resolvedBaseUrl}/api/assets/jdk/${version}/macos/${filename}`,
      });
    }

    // LTS判定 (8, 11, 17, 21はLTS)
    const isLTS = [8, 11, 17, 21].includes(entry.version);

    jdkSchema.push({
      version,
      downloads,
      vendor: "Eclipse Temurin",
      isLTS,
    });
  }

  return jdkSchema;
}

/**
 * jdk.jsonを更新
 */
export async function updateJDKJson(
  jdkSchema: JDKSchema,
  jdkJsonPath: string
): Promise<void> {
  const jsonContent = JSON.stringify(jdkSchema, null, 2);
  fs.writeFileSync(jdkJsonPath, jsonContent, "utf-8");
  console.log(`✅ Updated ${jdkJsonPath}`);
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
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * JDKバイナリをダウンロード
 */
export async function downloadJDKBinaries(
  latestJdksPath: string,
  resourcesDir: string
): Promise<void> {
  if (!fs.existsSync(latestJdksPath)) {
    throw new Error(`latest-jdks.json not found at ${latestJdksPath}`);
  }

  const rawData = fs.readFileSync(latestJdksPath, "utf-8");
  const latestJdks: LatestJDKEntry[] = JSON.parse(rawData);

  console.log("🔄 Checking and downloading JDK binaries...");

  for (const entry of latestJdks) {
    const version = entry.version.toString();
    console.log(`\n📦 Processing JDK ${version}...`);

    for (const [osKey, url] of Object.entries(entry.links)) {
      if (!url) continue;

      const osMap: Record<string, string> = {
        win: "windows",
        linux: "linux",
        mac: "macos",
      };
      const osName = osMap[osKey];
      const filename = path.basename(url);
      const destDir = path.join(resourcesDir, "jdk", version, osName);
      const destPath = path.join(destDir, filename);

      // ファイルが既に存在する場合はスキップ
      if (fs.existsSync(destPath)) {
        console.log(`   ⏭️  Skipping ${osName}/${filename} (already exists)`);
        continue;
      }

      // ディレクトリ作成
      fs.mkdirSync(destDir, { recursive: true });

      console.log(`   ⬇️  Downloading ${osName}/${filename}...`);
      try {
        await downloadFile(url, destPath);
      } catch (error: any) {
        console.error(`   ❌ Failed to download ${filename}:`, error.message);
      }
    }
  }

  console.log("\n✅ JDK binary check and download completed");
}

/**
 * JDK自動セットアップのメイン処理
 */
export async function setupJDKs(baseUrl?: string): Promise<void> {
  const resolvedBaseUrl = (baseUrl || getBaseUrl()).replace(/\/$/, "");
  const rootDir = path.join(__dirname, "..");
  const generatorDir = path.join(rootDir, "JDK_JSON_Genelator");
  const latestJdksPath = path.join(generatorDir, "latest-jdks.json");
  const jdkJsonPath = path.join(rootDir, "data", "jdk.json");
  const resourcesDir = path.join(rootDir, "resources");

  console.log("\n========================================");
  console.log("🚀 Starting JDK Auto Setup");
  console.log("========================================\n");

  try {
    // 1. JDK_JSON_Generatorを実行
    await runJDKGenerator();

    // 2. latest-jdks.jsonをjdk.json形式に変換
    console.log("\n🔄 Converting latest-jdks.json to jdk.json format...");
    const jdkSchema = await convertLatestJDKsToSchema(latestJdksPath, resolvedBaseUrl);

    // 3. jdk.jsonを更新
    await updateJDKJson(jdkSchema, jdkJsonPath);

    // 4. JDKバイナリをダウンロード
    await downloadJDKBinaries(latestJdksPath, resourcesDir);

    console.log("\n========================================");
    console.log("✅ JDK Auto Setup Completed Successfully");
    console.log("========================================\n");
  } catch (error: any) {
    console.error("\n========================================");
    console.error("❌ JDK Auto Setup Failed");
    console.error("========================================");
    console.error(error.message);
    throw error;
  }
}
