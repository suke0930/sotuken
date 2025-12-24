# FRP UI プロトタイプ（Minecraftポート抽象化）

## 目的
- ユーザーは「Minecraftサーバーのポートを外部公開する」操作だけで完結する
- 必要情報: `ローカルポート` と `公開URL(<public-domain>:port)` のペア
- extraMetas / 表示名 / セッション・プロセス概念はUIから隠蔽
- デバッグ用途で frpc ログ閲覧は残す
- 使用可能ポート/セッション枠がない場合は作成禁止

## 画面構成（FRP管理タブ再設計）
### 上段: 公開カード
- セレクト: 「公開するMinecraftサーバー」 (serversから `name (port)` 表示)
- 表示(非編集): `ローカルポート` = 選択サーバーのport
- 表示(非編集): `公開URL` = `<FRP_PUBLIC_DOMAIN || (UIアクセス先のhostname)>:<自動割当リモートポート>`
- ボタン: `公開を開始`（空きポート/セッション枠が無ければ disabled＋理由表示）
- ボタン: `停止`（選択サーバーが公開中のときだけ有効）
- 説明文: 「選んだMinecraftサーバーのポートを外部公開します。公開URLをメンバーに共有してください。」

### 中段: 現在の公開一覧
- 列: サーバー名 / ローカルポート / 公開URL / 状態(starting/running/error) / 操作(停止, ログ)
- 公開URLはコピーできるようにする

### 下段: frpcログ
- セッションID選択 + 行数指定 + Tail表示
- デバッグ用に残すが通常利用者は触れなくて良い位置/スタイル
# ユーザー追記
Frpcログに関しては、"ログを表示"ボタンとかおいて
ポップアップ・モーダルウィンドウで表示すると良いと思う

## データ/ロジック
- ローカルポート: サーバー選択で自動セット（手入力させない）
- リモートポート: `/api/frp/me` の `allowedPorts` から使用中ポート（/processes + /sessions + /me.activeSessions）を除外して自動割当。候補なしならエラー表示。
- セッション開始: payload は `remotePort` と `localPort` のみ送信（displayName/extraMetasなし）。
- 停止: 公開中行の「停止」ボタンから `/api/frp/sessions/:id DELETE`
- 状態表示: starting/running/error をバッジ表示。公開URLは `FRP_PUBLIC_DOMAIN` 環境値(無ければUIアクセス先のhostname)とリモートポートで組み立ててUI表示。
- 新規作成拒否条件: (a) allowedPorts の空きなし (b) maxSessions 到達 → ボタン disabled＋理由表示。

## 必要なUI変更 (概要)
- フォーム: displayName / extraMetas 入力欄を削除、サーバー選択 + 非編集フィールドのみ。
- 「セッション/プロセス」リストは非表示にし、「現在の公開一覧」に集約（内部では sessions/processes 情報を使う）。
- 公開URLの組み立て: `const domain = window.__FRP_PUBLIC_DOMAIN || window.location.hostname; url = domain + ':' + remotePort;`
- ログイン/認証の表示はこれまで通りだが、メイン操作は「公開を開始/停止」に集約。

## バリデーション/エラー表示
- サーバー未選択 → 開始ボタン disabled
- allowedPorts 空きなし → 「公開可能なポートがありません」
- maxSessions 超過 → 「セッション上限に達しています」
- 認証未完了 → 「Discordとリンクしてください」カード上に表示し、操作をロック

## 実装ステップ案
1) store: frpForm を `selectedServerId`, `localPort(readonly)`, `remotePort(readonly)`, `publicUrl` に整理。displayName/extraMetasを除去。`frpPublicDomain` 設定を追加（envから渡す）。
2) useFrp: allowedPorts から空きポートを計算するヘルパー追加。サーバー選択時に localPort+remotePort+publicUrl を自動セット。開始時に remote/local だけ POST。公開一覧は sessions+processes から公開URLを組み立てて UI用に整形。
3) UI: フォームをサーバー選択＋非編集表示に変更、現在の公開一覧テーブルに差し替え、ログセクションは下段に残す。

以上の方針でUIを組み替える想定です。実装に移してよければ着手します。 
