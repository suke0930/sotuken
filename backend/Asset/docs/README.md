# Backend Documentation

Minecraft サーバー情報API のバックエンドドキュメントへようこそ。

## 📚 ドキュメント一覧

### [API.md](./API.md)
APIエンドポイントの仕様、使用例、レスポンス形式について説明しています。

**内容:**
- エンドポイント一覧
- リクエスト/レスポンス例
- 使用例（cURL, JavaScript, Python）
- サポートされるサーバーソフトウェア
- JDKバージョン対応表

### [SCHEMA.md](./SCHEMA.md)
データスキーマと型定義の詳細な説明です。

**内容:**
- TypeScript型定義
- データ構造の説明
- バリデーション規則
- フィールド仕様
- 拡張性についての検討

---

## 🚀 クイックスタート

### 1. 型定義の確認

```typescript
import { ServerVersion, ServerSoftware, ServerSchema } from '../types/server.types';
```

### 2. サンプルデータの使用

```typescript
import { exampleData } from '../lib/sampleData';

console.log(exampleData);
```

### 3. API実装

```typescript
// routes/servers.ts で実装予定
app.get('/api/servers', (req, res) => {
  res.json({
    success: true,
    data: exampleData,
    timestamp: new Date().toISOString()
  });
});
```

---

## 📂 関連ファイル

| ファイル | 説明 |
|---------|------|
| `types/server.types.ts` | TypeScript型定義 |
| `lib/sampleData.ts` | サンプルデータとヘルパー関数 |
| `docs/API.md` | APIドキュメント |
| `docs/SCHEMA.md` | スキーマドキュメント |

---

## 🔧 次のステップ

1. **Express サーバーの実装**
   - `routes/servers.ts` にルート定義を作成
   - `controllers/servers.ts` にコントローラーを実装

2. **バリデーションの追加**
   - `schemas/` に Zod などを使ったバリデーションスキーマを追加

3. **実際のデータソースへの接続**
   - 外部API統合（Minecraft公式、Paper API等）
   - データベース接続

4. **テストの実装**
   - ユニットテスト
   - 統合テスト

---

## 💡 ヘルパー関数

`lib/sampleData.ts` には以下のヘルパー関数が用意されています：

```typescript
// 名前でサーバーを検索
findServerByName('Vanilla');

// バージョンでサーバーを検索
findServersByVersion('1.20.1');

// JDKバージョンでサーバーを検索
findServersByJdk('17');
```

---

## 📝 貢献

このドキュメントは継続的に更新されます。不明な点や改善提案があれば、お気軽にお知らせください。
