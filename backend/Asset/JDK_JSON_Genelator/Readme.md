
# 🧩 Temurin Latest JDK Fetcher

Adoptium Temurin の **最新JDKバイナリURL** を自動取得して  
`latest-jdks.json` に書き出す Node.js スクリプトです。

## 🚀 概要

このスクリプトは GitHub API を利用して  
以下の条件で各JDKバージョンの最新リリースURLを収集します。

- **JDK 8 / 11 / 17 / 21**
- **x64 アーキテクチャ**
- **OS: Windows / Linux / macOS**
- **Alpine Linux ビルドは除外**
- **拡張子**  
  - Windows: `.zip`  
  - Linux & macOS: `.tar.gz`

---

## 🧠 処理フロー

```mermaid
flowchart TD
    A[Start] --> B["Fetch JDK version list (API URLs)"]
    B --> C["Call GitHub API /releases/latest"]
    C --> D["Get asset list"]
    D --> E["Filter by OS keyword"]
    E --> F["Check extension (.zip / .tar.gz)"]
    F --> G["Exclude alpine-linux builds"]
    G --> H["Extract matching URLs"]
    H --> I["Format as JSON"]
    I --> J["Write to latest-jdks.json"]
    J --> K[Done ✅]

````

---

## ⚙️ 使い方

### 1. 依存関係をインストール

```bash
npm install axios
```

### 2. 実行

```bash
node fetch-temurin-latest.js
```

### 3. 出力例

`latest-jdks.json` が生成されます：

```json
[
  {
    "version": 21,
    "links": {
      "win": "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.9+10/OpenJDK21U-jdk_x64_windows_hotspot_21.0.9_10.zip",
      "linux": "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.9+10/OpenJDK21U-jdk_x64_linux_hotspot_21.0.9_10.tar.gz",
      "mac": "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.9+10/OpenJDK21U-jdk_x64_mac_hotspot_21.0.9_10.tar.gz"
    }
  }
]
```

---

## 🧩 拡張案

* `aarch64` や `arm64` のサポート追加
* `JRE` ビルドのURL取得対応
* GitHub Tokenによるレート制限回避
* 自動スケジューリング（cron, GitHub Actions）

---

## 📝 ライセンス

このスクリプト自体は MIT License です。
ただし **JDKバイナリは Eclipse Foundation / Adoptium のライセンスに準拠** します。

参照：
🔗 [https://adoptium.net/](https://adoptium.net/)

