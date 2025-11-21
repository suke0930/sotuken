# テスト項目一覧

## 1. インスタンス管理

### 1.1 インスタンス追加

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-001 | 正常なインスタンス追加 | 1. 有効なパラメータでaddInstance呼び出し<br/>2. 結果確認 | success: true, uuidが返却される |
| TC-002 | 名前重複エラー | 1. 同じ名前で2回addInstance<br/>2. 2回目の結果確認 | success: false, error: "Name already exists" |
| TC-003 | 無効なJDKバージョン | 1. 存在しないJDKバージョンを指定<br/>2. 結果確認 | success: false, error: "JDK not found" |
| TC-004 | ディレクトリ作成確認 | 1. addInstance実行<br/>2. servers/{name}/ディレクトリ確認 | ディレクトリが作成されている |
| TC-005 | server.properties作成確認 | 1. ポート指定してaddInstance<br/>2. server.properties確認 | server-portが正しく設定されている |
| TC-006 | eula.txt作成確認 | 1. addInstance実行<br/>2. eula.txt確認 | eula=trueが記述されている |
| TC-007 | jarファイルコピー確認 | 1. addInstance実行<br/>2. server.jar確認 | jarファイルがコピーされている |

### 1.2 インスタンス削除

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-101 | 正常な削除 | 1. 停止中のインスタンスでremoveInstance<br/>2. 結果確認 | success: true |
| TC-102 | ディレクトリ削除確認 | 1. removeInstance実行<br/>2. servers/{name}/確認 | ディレクトリが削除されている |
| TC-103 | 起動中サーバー削除エラー | 1. 起動中のインスタンスでremoveInstance<br/>2. 結果確認 | success: false, error: "running" |
| TC-104 | 存在しないUUID | 1. 無効なUUIDでremoveInstance<br/>2. 結果確認 | success: false, error: "not found" |
| TC-105 | ディレクトリ削除失敗時のロールバック | 1. ディレクトリにロックをかける<br/>2. removeInstance実行<br/>3. レジストリ確認 | レジストリに残っている |

### 1.3 インスタンス更新

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-201 | note更新（起動中） | 1. 起動中のサーバーでnote更新<br/>2. 結果確認 | success: true |
| TC-202 | port更新（停止中） | 1. 停止中のサーバーでport更新<br/>2. server.properties確認 | ポートが更新されている |
| TC-203 | name更新 | 1. 停止中のサーバーでname更新<br/>2. ディレクトリ名確認 | ディレクトリ名も変更されている |
| TC-204 | メモリ設定更新 | 1. maxMemory, minMemory更新<br/>2. データ確認 | メモリ設定が更新されている |
| TC-205 | 起動中サーバーの更新エラー | 1. 起動中のサーバーでport更新試行<br/>2. 結果確認 | success: false, error: "running" |

## 2. サーバー起動・停止

### 2.1 起動

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-301 | 正常起動 | 1. startServer呼び出し<br/>2. ステータス確認 | status: 'running' |
| TC-302 | 既に起動中のサーバー起動 | 1. 起動中のサーバーに対してstartServer<br/>2. 結果確認 | success: false, error: "Already running" |
| TC-303 | JDKロック取得確認 | 1. startServer実行<br/>2. JDKEntry.isLocked()確認 | true |
| TC-304 | 稼働時間追跡開始 | 1. startServer実行<br/>2. currentSessionStartTime確認 | タイムスタンプが設定されている |

### 2.2 停止

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-401 | 正常停止 | 1. 起動中のサーバーでstopServer<br/>2. ステータス確認 | status: 'stopped' |
| TC-402 | タイムアウト処理 | 1. stopServerをタイムアウト時間短縮して実行<br/>2. コールバック確認 | onStopTimeoutが呼ばれる |
| TC-403 | 停止中サーバー停止エラー | 1. 停止中のサーバーでstopServer<br/>2. 結果確認 | success: false, error: "Not running" |
| TC-404 | JDKロック解放確認 | 1. stopServer実行<br/>2. JDKEntry.isLocked()確認 | false |
| TC-405 | 稼働時間更新確認 | 1. 起動後停止<br/>2. totalUptime確認 | 稼働時間が加算されている |

### 2.3 再起動

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-501 | 正常再起動 | 1. 起動中のサーバーでrestartServer<br/>2. ステータス確認 | status: 'running' |
| TC-502 | 停止中サーバー再起動 | 1. 停止中のサーバーでrestartServer<br/>2. ステータス確認 | status: 'running' |

### 2.4 強制終了

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-601 | 強制終了実行 | 1. forceKillServer呼び出し<br/>2. コールバック確認 | onForcedKillが呼ばれる |
| TC-602 | タイムアウト後の強制終了 | 1. stopServerでタイムアウト<br/>2. forceKillServer実行 | プロセスが終了する |

## 3. バリデーション

### 3.1 名前バリデーション

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-701 | 有効な名前 | 1. 正常な名前でvalidateName<br/>2. 結果確認 | valid: true |
| TC-702 | 空文字 | 1. 空文字でvalidateName<br/>2. 結果確認 | valid: false, error: "empty" |
| TC-703 | 長すぎる名前 | 1. 51文字以上でvalidateName<br/>2. 結果確認 | valid: false, error: "too long" |
| TC-704 | 無効文字 | 1. 特殊文字を含む名前でvalidateName<br/>2. 結果確認 | valid: false, error: "invalid characters" |
| TC-705 | 重複名 | 1. 既存の名前でvalidateName<br/>2. 結果確認 | valid: false, error: "already exists" |

### 3.2 ポートバリデーション

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-801 | 有効なポート | 1. 25565でvalidatePort<br/>2. 結果確認 | valid: true |
| TC-802 | 範囲外（低） | 1. 0でvalidatePort<br/>2. 結果確認 | valid: false, error: "invalid" |
| TC-803 | 範囲外（高） | 1. 65536でvalidatePort<br/>2. 結果確認 | valid: false, error: "invalid" |
| TC-804 | well-knownポート警告 | 1. 80でvalidatePort<br/>2. 結果確認 | valid: true, warnings: ["well-known"] |
| TC-805 | 稼働中サーバーとの競合 | 1. 稼働中サーバーと同じポートでvalidatePort<br/>2. 結果確認 | valid: false, error: "in use" |
| TC-806 | 停止中サーバーとの競合 | 1. 停止中サーバーと同じポートでvalidatePort<br/>2. 結果確認 | valid: true, warnings: ["configured"] |

### 3.3 JDKバリデーション

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-901 | インストール済みJDK | 1. インストール済みバージョンでvalidateJdkVersion<br/>2. 結果確認 | valid: true |
| TC-902 | 未インストールJDK | 1. 未インストールバージョンでvalidateJdkVersion<br/>2. 結果確認 | valid: false, error: "not installed" |
| TC-903 | 非整数バージョン | 1. 17.5でvalidateJdkVersion<br/>2. 結果確認 | valid: false, error: "invalid" |
| TC-904 | ファイル欠損JDK | 1. ファイル欠損のJDKバージョンで確認<br/>2. 結果確認 | valid: false, error: "missing" |
| TC-905 | ファイル破損JDK | 1. ファイル破損のJDKバージョンで確認<br/>2. 結果確認 | valid: false, error: "corrupted" |

### 3.4 メモリバリデーション

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1001 | 有効なメモリ設定 | 1. 1024, 2048でvalidateMemorySettings<br/>2. 結果確認 | valid: true |
| TC-1002 | 最小値未満 | 1. 256, 2048でvalidateMemorySettings<br/>2. 結果確認 | valid: false, error: "at least 512MB" |
| TC-1003 | max < min | 1. 2048, 1024でvalidateMemorySettings<br/>2. 結果確認 | valid: false, error: "greater than" |
| TC-1004 | システムメモリ超過警告 | 1. 非常に大きい値でvalidateMemorySettings<br/>2. 結果確認 | valid: true, warnings: ["exceeds"] |

## 4. server.properties管理

### 4.1 ファイル作成・読み込み

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1101 | ファイル作成 | 1. create()実行<br/>2. ファイル存在確認 | ファイルが作成されている |
| TC-1102 | プロパティ読み込み | 1. read()実行<br/>2. データ確認 | プロパティが正しく読み込まれる |
| TC-1103 | コメント行スキップ | 1. コメント行を含むファイルでread()<br/>2. データ確認 | コメント行は無視される |
| TC-1104 | 空行スキップ | 1. 空行を含むファイルでread()<br/>2. データ確認 | 空行は無視される |
| TC-1105 | 値に=を含む | 1. "motd=a=b=c"でread()<br/>2. データ確認 | value: "a=b=c" |

### 4.2 プロパティ更新

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1201 | 既存プロパティ更新 | 1. update()で既存キー更新<br/>2. read()で確認 | 値が更新されている |
| TC-1202 | 新規プロパティ追加 | 1. update()で新規キー追加<br/>2. read()で確認 | 新規キーが追加されている |
| TC-1203 | ファイル未作成時の更新 | 1. ファイルなしでupdate()<br/>2. ファイル確認 | ファイルが作成され、値が設定されている |
| TC-1204 | ポート更新 | 1. updatePort()実行<br/>2. getPort()確認 | ポートが更新されている |
| TC-1205 | 複数プロパティ一括更新 | 1. updateMultiple()実行<br/>2. read()確認 | すべてのプロパティが更新されている |

## 5. 自動再起動

### 5.1 自動再起動機能

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1301 | クラッシュ時の再起動 | 1. autoRestart有効<br/>2. クラッシュさせる<br/>3. ステータス確認 | 自動再起動される |
| TC-1302 | 再起動上限到達 | 1. maxConsecutiveRestarts=2<br/>2. 3回クラッシュ<br/>3. コールバック確認 | onAutoRestartLimitReachedが呼ばれる |
| TC-1303 | カウンターリセット | 1. 起動<br/>2. 10分待機<br/>3. カウンター確認 | 0にリセットされている |
| TC-1304 | 正常終了時の再起動なし | 1. autoRestart有効<br/>2. 正常停止<br/>3. ステータス確認 | 再起動されない |

## 6. イベントコールバック

### 6.1 コールバック呼び出し

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1401 | onServerStarted | 1. startServer実行<br/>2. コールバック確認 | onServerStartedが呼ばれる |
| TC-1402 | onServerStopped | 1. stopServer実行<br/>2. コールバック確認 | onServerStoppedが呼ばれる |
| TC-1403 | onServerCrashed | 1. サーバークラッシュ<br/>2. コールバック確認 | onServerCrashedが呼ばれる |
| TC-1404 | onStopTimeout | 1. stopServerでタイムアウト<br/>2. コールバック確認 | onStopTimeoutが呼ばれる |
| TC-1405 | onForcedKill | 1. forceKillServer実行<br/>2. コールバック確認 | onForcedKillが呼ばれる |

## 7. 標準入出力

### 7.1 I/O監視

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1501 | stdout監視 | 1. openProcessStd実行<br/>2. コマンド送信<br/>3. コールバック確認 | onStdoutが呼ばれる |
| TC-1502 | stderr監視 | 1. openProcessStd実行<br/>2. エラー発生<br/>3. コールバック確認 | onStderrが呼ばれる |
| TC-1503 | 監視停止 | 1. closeProcessStd実行<br/>2. コマンド送信<br/>3. コールバック確認 | コールバックは呼ばれない |

### 7.2 コマンド送信

| ID | テスト項目 | 手順 | 期待結果 |
|----|----------|------|---------|
| TC-1601 | コマンド送信 | 1. sendCommand('say test')実行<br/>2. stdout確認 | コマンドが実行される |
| TC-1602 | 停止中サーバーへのコマンド | 1. 停止中のサーバーでsendCommand<br/>2. ログ確認 | 警告ログが出力される |

---

## テスト実行方法

```bash
# すべてのテスト実行
npm test

# 単体テストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# E2Eテストのみ
npm run test:e2e

# カバレッジ付き実行
npm test -- --coverage
```
