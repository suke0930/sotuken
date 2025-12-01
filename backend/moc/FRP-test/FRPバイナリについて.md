# 概要
FRPバイナリは
my-frp-project/
├── frps/                        # FRPサーバー実行環境
│   ├── frps                     # frpsバイナリ
│   └── frps.toml                # サーバー設定
に前提として存在することになっていますが、これを自動でサーバからバイナリをダウンロードし
解凍・配置を行うシステムにしてください
バイナリのダウンロードリンクは以下の形式で、/config.jsonから取得することとします
```config.json
{
    "win":"https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_windows_amd64.zip",
    "mac":"https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_darwin_amd64.tar.gz",
    "linux":"https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz"
}
```
OSの自動判断後、これらのバイナリのダウンロードを行い
自動でファイルを配置することとします。
なお、解凍後のファイル構成は
```
I:\ダウソパス\新しいフォルダー (19)>tree
フォルダー パスの一覧:  ボリューム ICE製
ボリューム シリアル番号は 0419-05BD です
I:.
└─frp_0.65.0_windows_amd64

I:\ダウソパス\新しいフォルダー (19)>ls ./frp_0.65.0_windows_amd64
LICENSE    frpc.exe   frpc.toml  frps.exe   frps.toml

I:\ダウソパス\新しいフォルダー (19)>
```
のようになっているようです
適切に配置をお願いします。

config.jsonが存在しない場合は作成し、一度ユーザーにファイルの詳細を埋めるよう指示した後、
プログラムを終了する挙動とします。