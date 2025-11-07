// npm install axios
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// 出力ファイル名（同ディレクトリに生成）
const outputFile = path.join(__dirname, "latest-jdks.json");

// 各JDKバージョンとAPIエンドポイント
const jdks = [
    [21, "https://api.github.com/repos/adoptium/temurin21-binaries/releases/latest"],
    [17, "https://api.github.com/repos/adoptium/temurin17-binaries/releases/latest"],
    [11, "https://api.github.com/repos/adoptium/temurin11-binaries/releases/latest"],
    [8, "https://api.github.com/repos/adoptium/temurin8-binaries/releases/latest"],
];

// OSごとの識別ルール
const targets = {
    win: { keyword: "jdk_x64_windows_hotspot", ext: ".zip" },
    linux: { keyword: "jdk_x64_linux_hotspot", ext: ".tar.gz", exclude: "alpine-linux" },
    mac: { keyword: "jdk_x64_mac_hotspot", ext: ".tar.gz" },
};

// メイン処理
(async () => {
    const results = [];

    for (const [version, apiUrl] of jdks) {
        try {
            const res = await axios.get(apiUrl, { headers: { "User-Agent": "adoptium-fetcher" } });
            const assets = res.data.assets;
            if (!assets) continue;

            const links = {};

            for (const [os, { keyword, ext, exclude }] of Object.entries(targets)) {
                const asset = assets.find(a =>
                    a.name.includes(keyword) &&
                    a.name.endsWith(ext) &&
                    (!exclude || !a.name.includes(exclude))
                );
                if (asset) links[os] = asset.browser_download_url;
            }

            results.push({ version, links });
        } catch (err) {
            console.error(`Failed to fetch JDK ${version}:`, err.message);
        }
    }

    // JSONファイルとして保存
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf8");

    console.log(`✅ 最新JDKバイナリURLを "${outputFile}" に書き出しました！`);
})();
