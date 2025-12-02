# 開発環境のセットアップ

## 開発モードでの起動

開発モードでは、ソースコードの変更が即座にコンテナに反映されます（ホットリロード対応）。

```bash
# 開発環境の起動
docker-compose -f docker-compose.dev.yml up -d

# ログの確認
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

## 本番モードでの起動

本番モードでは、ソースコードがイメージにビルドされます。

```bash
# 本番環境の起動
docker-compose up -d

# ビルドし直して起動
docker-compose up -d --build
```

## 開発モードと本番モードの違い

### 開発モード (docker-compose.dev.yml)
- **ソースコードがボリュームマウント**: `src`フォルダが直接マウントされるため、コード変更が即座に反映
- **tsx watch**: ファイル変更を検知して自動的に再起動
- **リビルド不要**: コード変更時にイメージのリビルドは不要
- **node_modules保護**: Named volumeで`node_modules`が保護され、ホストのファイルで上書きされない

### 本番モード (docker-compose.yml)
- **ソースコードがイメージに含まれる**: ビルド時にコードがコピーされる
- **コード変更時はリビルドが必要**: `docker-compose up -d --build`
- **最適化されたイメージ**: 本番デプロイ用

## トラブルシューティング

### node_modulesの依存関係を更新した場合

package.jsonを変更した場合は、コンテナを再ビルドする必要があります:

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

### ボリュームをクリーンアップしたい場合

```bash
# コンテナとボリュームをすべて削除
docker-compose -f docker-compose.dev.yml down -v

# 再起動
docker-compose -f docker-compose.dev.yml up -d --build
```

### ホットリロードが動作しない場合

1. ログを確認:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f frp-authjs
   ```

2. コンテナ内でファイルが正しくマウントされているか確認:
   ```bash
   docker exec -it frp-authjs ls -la /app/src
   ```

## 推奨ワークフロー

1. **日常開発**: `docker-compose.dev.yml`を使用
2. **本番デプロイ前のテスト**: `docker-compose.yml`で本番環境をシミュレート
3. **CI/CD**: `docker-compose.yml`を使用してビルド・デプロイ
