# FAQ - よくある質問と既知の問題

## 一般的な質問

### Q1: JDKManagerの初期化を忘れるとどうなりますか？

**A:** ServerManager初期化時にはエラーが発生しませんが、サーバー起動時に「JDK not found」エラーが発生します。

**正しい初期化順序:**
```typescript
// 1. JDKManager初期化
const jdkManager = new JdkManager('./runtime');
await jdkManager.Data.load();

// 2. ServerManager初期化
const manager = await ServerManager.initialize(..., jdkManager, ...);
```

---

### Q2: ポート重複チェックを通過したのに起動に失敗する

**原因:**
- 外部アプリケーションがポートを使用中
- OS側でポートがブロックされている
- ファイアウォールの設定

**対処法:**
1. `netstat -ano | findstr :{PORT}` (Windows) でポート使用状況確認
2. 他のアプリケーションを終了
3. ファイアウォール設定を確認

---

### Q3: stopServer()がタイムアウトした後の対処法

**A:** タイムアウト後、プロセスはまだ実行中です。以下の手順で対処してください：

```typescript
// 1. 停止試行（タイムアウト30秒）
const stopResult = await manager.stopServer(uuid, 30000);

// 2. タイムアウトコールバックを受け取る
callbacks.onStopTimeout?.(uuid, 'Timeout message');

// 3. ユーザーに確認ダイアログを表示
const shouldForceKill = confirm('強制終了しますか？（データ破損の可能性があります）');

// 4. 強制終了
if (shouldForceKill) {
  manager.forceKillServer(uuid);
}
```

---

## クラッシュ判定

### Q4: 正常終了なのにクラッシュ扱いになる

**原因:**
一部のサーバーソフトウェアは正常終了でもexitCode != 0を返す場合があります。

**現在の実装:**
- `exitCode === 0`: 正常終了
- `exitCode !== 0`: クラッシュ

**対処法:**
現時点では回避方法がありません。将来的にソフトウェアごとの判定ロジック追加を検討中です。

---

## パフォーマンス

### Q5: 稼働時間の更新頻度を変更できますか？

**A:** 現在は5分ごとに固定されています。変更するには`constants/errors.ts`の`UPTIME_UPDATE_INTERVAL`を編集してください。

```typescript
export const DefaultValues = {
  UPTIME_UPDATE_INTERVAL: 5 * 60 * 1000, // 5分 → お好みの値に変更
  // ...
}
```

---

## メモリ設定

### Q6: メモリ警告が出るがサーバーは動作する

**A:** メモリ警告は注意喚起のみで、起動は可能です。

**警告条件:**
- `maxMemory > システムメモリ * 0.8`
- `maxMemory > 現在の空きメモリ`

**推奨:**
- 他のアプリケーションを終了してメモリを確保
- maxMemoryを減らす
- システムメモリを増設

---

## 自動再起動

### Q7: 自動再起動の上限に達したらどうなりますか？

**A:** `onAutoRestartLimitReached`コールバックが呼ばれ、サーバーは停止状態になります。

```typescript
callbacks: {
  onAutoRestartLimitReached: (uuid) => {
    console.error(`Server ${uuid} reached auto-restart limit`);
    // ユーザーに通知
    // ログを確認して原因を調査
  }
}
```

**原因調査:**
1. サーバーログを確認（`servers/{name}/logs/latest.log`）
2. JDKバージョンが適切か確認
3. メモリ設定が適切か確認
4. jarファイルが破損していないか確認

---

## ファイル操作

### Q8: removeInstance()がディレクトリ削除に失敗する

**原因:**
- ファイルが他のプロセスに使用されている
- 権限不足
- ファイルシステムの問題

**対処法:**
1. サーバーが完全に停止しているか確認
2. ファイルマネージャーなどでディレクトリを開いていないか確認
3. 管理者権限で実行
4. 手動でディレクトリを削除してから`removeInstance()`を再試行

---

## 設定ファイル

### Q9: 設定ファイルのバージョンが一致しない警告

**A:** 警告のみで動作は継続されます。Zodバリデーションで構造の正当性が保証されます。

**対応が必要な場合:**
将来的なマイグレーション機能の実装を待つか、手動で設定ファイルを編集してください。

---

## トラブルシューティング

### デバッグ情報の取得

```typescript
// インスタンス情報
const data = manager.getInstanceData(uuid);
console.log('Status:', data?.status);
console.log('Port:', data?.launchConfig.port);

// 稼働中インスタンス
const running = manager.getRunningInstances();
console.log('Running servers:', running.length);

// バリデーション確認
const validator = manager.getValidator();
const portResult = validator.validatePort(25565);
console.log('Port validation:', portResult);
```

---

## 既知の制限

1. **ポート競合検出**: 外部アプリケーションが使用中のポートは検出できません
2. **プロセス監視**: タスクマネージャーなどで直接プロセスを終了した場合、状態が同期されません
3. **ディスク容量**: ディスク容量不足のチェックは実装されていません
4. **ネットワーク設定**: ファイアウォール設定の自動化は実装されていません

---

## サポート

その他の問題については、プロジェクトのIssueトラッカーをご確認ください。
