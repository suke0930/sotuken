const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * HTTPSでJSONを取得
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${url}: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Paper APIから特定バージョンの最新ビルド情報を取得
 */
async function getPaperLatestBuild(version) {
  try {
    const versionData = await fetchJSON(`https://api.papermc.io/v2/projects/paper/versions/${version}`);
    const builds = versionData.builds;
    const latestBuild = builds[builds.length - 1];

    const buildData = await fetchJSON(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}`);
    const jarFileName = buildData.downloads.application.name;

    return {
      version: version,
      build: latestBuild,
      downloadUrl: `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}/downloads/${jarFileName}`
    };
  } catch (error) {
    console.error(`Failed to fetch Paper ${version}:`, error.message);
    return null;
  }
}

/**
 * Fabric Loaderの最新バージョンを取得
 */
async function getFabricLatestLoader() {
  try {
    const data = await fetchJSON('https://meta.fabricmc.net/v2/versions/loader');
    return data[0].version; // 最新のローダーバージョン
  } catch (error) {
    console.error('Failed to fetch Fabric loader version:', error.message);
    return '0.17.3'; // フォールバック
  }
}

/**
 * Fabric Installerの最新バージョンを取得
 */
async function getFabricLatestInstaller() {
  try {
    const data = await fetchJSON('https://meta.fabricmc.net/v2/versions/installer');
    return data[0].version; // 最新のインストーラーバージョン
  } catch (error) {
    console.error('Failed to fetch Fabric installer version:', error.message);
    return '1.1.0'; // フォールバック
  }
}

/**
 * JDKバージョンを取得
 */
function getJdkVersion(mcVersion, jdkMap) {
  return jdkMap[mcVersion]?.toString() || '17'; // デフォルトは17
}

/**
 * メイン処理
 */
async function generateServersJson() {
  console.log('🔄 Generating latest-servers.json from APIs...\n');

  const serversJsonPath = path.join(__dirname, 'servers.json');

  if (!fs.existsSync(serversJsonPath)) {
    console.error('❌ servers.json not found!');
    process.exit(1);
  }

  const sourceData = JSON.parse(fs.readFileSync(serversJsonPath, 'utf-8'));
  const result = [];
  let jdkMap = {};

  // jdkmap を抽出
  const jdkMapEntry = sourceData.find(item => item.jdkmap);
  if (jdkMapEntry) {
    jdkMap = jdkMapEntry.jdkmap;
    console.log('📋 JDK mapping loaded');
  }

  // 各サーバーエントリを処理
  for (const server of sourceData) {
    if (server.jdkmap) continue; // jdkmap はスキップ

    if (server.type === 'dynamic') {
      // 動的取得
      const dynamicData = {
        name: server.name,
        versions: []
      };

      if (server.name === 'Paper') {
        console.log(`\n📄 Fetching ${server.name} versions...`);
        for (const version of server.versions) {
          const buildInfo = await getPaperLatestBuild(version);
          if (buildInfo) {
            console.log(`  ✅ ${server.name} ${version}: build ${buildInfo.build}`);
            const jdk = getJdkVersion(version, jdkMap);
            dynamicData.versions.push({
              version: buildInfo.version,
              jdk: jdk,
              downloadUrl: buildInfo.downloadUrl
            });
          }
        }
      } else if (server.name === 'Fabric') {
        console.log(`\n🧵 Fetching ${server.name} versions...`);
        const loaderVersion = await getFabricLatestLoader();
        const installerVersion = await getFabricLatestInstaller();
        console.log(`  ℹ️  Latest Loader: ${loaderVersion}`);
        console.log(`  ℹ️  Latest Installer: ${installerVersion}`);

        for (const version of server.versions) {
          const downloadUrl = `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVersion}/${installerVersion}/server/jar`;
          console.log(`  ✅ ${server.name} ${version}`);
          const jdk = getJdkVersion(version, jdkMap);
          dynamicData.versions.push({
            version: version,
            jdk: jdk,
            downloadUrl: downloadUrl
          });
        }
      }

      result.push(dynamicData);

    } else if (server.type === 'static') {
      // 静的エントリを従来形式に変換
      console.log(`\n📦 Adding static entry: ${server.name}`);
      const staticData = {
        name: server.name,
        versions: []
      };

      for (const versionInfo of server.versions) {
        const jdk = getJdkVersion(versionInfo.v, jdkMap);
        staticData.versions.push({
          version: versionInfo.v,
          jdk: jdk,
          downloadUrl: versionInfo.url
        });
      }

      result.push(staticData);
    }
  }

  // latest-servers.json に保存（従来形式）
  const outputPath = path.join(__dirname, 'latest-servers.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n✅ Generated: ${outputPath}`);
  console.log(`📊 Total server types: ${result.length}`);
}

// 実行
generateServersJson().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});