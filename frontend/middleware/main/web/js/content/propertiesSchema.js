/**
 * Minecraft Server Properties Schema
 * 
 * Bilingual schema definition for server.properties with three tiers:
 * - Basic (14 properties): For beginners
 * - Advanced (18 properties): For intermediate users
 * - Dev (20 properties): For developers/advanced users
 * 
 * Created: November 26, 2025
 * Based on: Sceme_docs.md
 */

export const propertiesSchema = {
    basic: {
        "motd": {
            type: "string",
            default: "A Minecraft Server",
            required: true,
            explanation: {
                en: "Message of the day shown in the server list",
                ja: "サーバーリストに表示されるメッセージ"
            },
            constraints: {
                minLength: 0,
                maxLength: 59
            }
        },
        "max-players": {
            type: "number",
            default: 20,
            required: true,
            explanation: {
                en: "Maximum number of players that can join the server",
                ja: "サーバーに同時接続できる最大プレイヤー数"
            },
            constraints: {
                min: 1,
                max: 1000
            }
        },
        "difficulty": {
            type: "enum",
            default: "easy",
            required: true,
            explanation: {
                en: "Defines the difficulty of the server",
                ja: "サーバーの難易度を設定します"
            },
            constraints: {
                options: [
                    { value: "peaceful", label: { en: "Peaceful", ja: "ピースフル" } },
                    { value: "easy", label: { en: "Easy", ja: "イージー" } },
                    { value: "normal", label: { en: "Normal", ja: "ノーマル" } },
                    { value: "hard", label: { en: "Hard", ja: "ハード" } }
                ]
            }
        },
        "gamemode": {
            type: "enum",
            default: "survival",
            required: true,
            explanation: {
                en: "Default game mode for new players",
                ja: "新規プレイヤーのデフォルトゲームモード"
            },
            constraints: {
                options: [
                    { value: "survival", label: { en: "Survival", ja: "サバイバル" } },
                    { value: "creative", label: { en: "Creative", ja: "クリエイティブ" } },
                    { value: "adventure", label: { en: "Adventure", ja: "アドベンチャー" } },
                    { value: "spectator", label: { en: "Spectator", ja: "観戦者" } }
                ]
            }
        },
        "hardcore": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "If true, players will be banned when they die",
                ja: "有効にするとプレイヤーは死亡時にBANされます"
            },
            constraints: {}
        },
        "pvp": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Enable PvP on the server",
                ja: "プレイヤー同士の戦闘を許可します"
            },
            constraints: {}
        },
        "allow-nether": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Allow players to travel to the Nether",
                ja: "ネザーへの移動を許可します"
            },
            constraints: {}
        },
        "spawn-monsters": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Determines if monsters can spawn",
                ja: "敵対モブの自然スポーンを許可します"
            },
            constraints: {}
        },
        "spawn-animals": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Determines if animals can spawn",
                ja: "友好モブの自然スポーンを許可します"
            },
            constraints: {}
        },
        "spawn-npcs": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Determines if villagers can spawn",
                ja: "村人のスポーンを許可します"
            },
            constraints: {}
        },
        "level-name": {
            type: "string",
            default: "world",
            required: true,
            explanation: {
                en: "Name of the world/level folder",
                ja: "ワールド/レベルフォルダの名前"
            },
            constraints: {
                minLength: 1,
                maxLength: 255
            }
        },
        "level-seed": {
            type: "string",
            default: "",
            required: false,
            explanation: {
                en: "Seed for world generation (leave empty for random)",
                ja: "ワールド生成のシード値（空欄でランダム）"
            },
            constraints: {
                minLength: 0,
                maxLength: 255
            }
        },
        "level-type": {
            type: "enum",
            default: "default",
            required: true,
            explanation: {
                en: "Type of world to generate",
                ja: "生成するワールドのタイプ"
            },
            constraints: {
                options: [
                    { value: "default", label: { en: "Default", ja: "デフォルト" } },
                    { value: "flat", label: { en: "Flat", ja: "フラット" } },
                    { value: "large_biomes", label: { en: "Large Biomes", ja: "大きなバイオーム" } },
                    { value: "amplified", label: { en: "Amplified", ja: "アンプリファイド" } }
                ]
            }
        },
        "white-list": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Only whitelisted players can join",
                ja: "ホワイトリストに登録されたプレイヤーのみ接続可能"
            },
            constraints: {}
        }
    },
    
    advanced: {
        "view-distance": {
            type: "number",
            default: 10,
            required: true,
            explanation: {
                en: "Amount of world data sent to clients (in chunks)",
                ja: "プレイヤーに送信する描画距離（チャンク数）"
            },
            constraints: {
                min: 3,
                max: 32
            }
        },
        "simulation-distance": {
            type: "number",
            default: 10,
            required: true,
            explanation: {
                en: "Distance in chunks around players that will be ticked",
                ja: "プレイヤー周辺でシミュレーションする距離（チャンク数）"
            },
            constraints: {
                min: 3,
                max: 32
            }
        },
        "spawn-protection": {
            type: "number",
            default: 16,
            required: true,
            explanation: {
                en: "Radius of spawn protection (in blocks)",
                ja: "スポーン地点の保護範囲（ブロック数）"
            },
            constraints: {
                min: 0,
                max: 100
            }
        },
        "allow-flight": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Allow players to fly in Survival mode",
                ja: "サバイバルモードでの飛行を許可します"
            },
            constraints: {}
        },
        "force-gamemode": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Force players to join in the default gamemode",
                ja: "プレイヤーにデフォルトのゲームモードを強制します"
            },
            constraints: {}
        },
        "generate-structures": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Generate structures (villages, strongholds, etc.)",
                ja: "構造物（村、要塞など）を生成します"
            },
            constraints: {}
        },
        "max-world-size": {
            type: "number",
            default: 29999984,
            required: true,
            explanation: {
                en: "Maximum world radius (in blocks)",
                ja: "ワールドの最大半径（ブロック数）"
            },
            constraints: {
                min: 1,
                max: 29999984
            }
        },
        "player-idle-timeout": {
            type: "number",
            default: 0,
            required: true,
            explanation: {
                en: "Kick idle players after this many minutes (0 = disabled)",
                ja: "指定した分数アイドル状態のプレイヤーをキック（0=無効）"
            },
            constraints: {
                min: 0,
                max: 1440
            }
        },
        "online-mode": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Verify players through Minecraft's authentication servers",
                ja: "Minecraft認証サーバーでプレイヤーを検証します"
            },
            constraints: {}
        },
        "enable-command-block": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Enable command blocks",
                ja: "コマンドブロックの使用を許可します"
            },
            constraints: {}
        },
        "op-permission-level": {
            type: "number",
            default: 4,
            required: true,
            explanation: {
                en: "Default permission level for ops (1-4)",
                ja: "OP権限のデフォルトレベル（1-4）"
            },
            constraints: {
                min: 1,
                max: 4
            }
        },
        "enforce-whitelist": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Enforce whitelist without restarting server",
                ja: "サーバー再起動なしでホワイトリストを強制します"
            },
            constraints: {}
        },
        "require-resource-pack": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Require clients to accept the resource pack",
                ja: "クライアントにリソースパックの受け入れを要求します"
            },
            constraints: {}
        },
        "resource-pack": {
            type: "string",
            default: "",
            required: false,
            explanation: {
                en: "URL to the server resource pack",
                ja: "サーバーリソースパックのURL"
            },
            constraints: {
                minLength: 0,
                maxLength: 1024
            }
        },
        "resource-pack-prompt": {
            type: "string",
            default: "",
            required: false,
            explanation: {
                en: "Custom message for resource pack prompt",
                ja: "リソースパックプロンプトのカスタムメッセージ"
            },
            constraints: {
                minLength: 0,
                maxLength: 255
            }
        },
        "resource-pack-sha1": {
            type: "string",
            default: "",
            required: false,
            explanation: {
                en: "SHA-1 hash of the resource pack",
                ja: "リソースパックのSHA-1ハッシュ"
            },
            constraints: {
                minLength: 0,
                maxLength: 40
            }
        },
        "generator-settings": {
            type: "string",
            default: "{}",
            required: false,
            explanation: {
                en: "Generator settings (JSON format)",
                ja: "ジェネレーター設定（JSON形式）"
            },
            constraints: {
                minLength: 0,
                maxLength: 2048
            }
        },
        "initial-enabled-packs": {
            type: "string",
            default: "vanilla",
            required: false,
            explanation: {
                en: "Comma-separated list of enabled data packs",
                ja: "有効なデータパックのカンマ区切りリスト"
            },
            constraints: {
                minLength: 0,
                maxLength: 1024
            }
        }
    },
    
    dev: {
        "enable-rcon": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Enable remote console",
                ja: "リモートコンソール（RCON）を有効化します"
            },
            constraints: {}
        },
        "rcon.port": {
            type: "number",
            default: 25575,
            required: true,
            explanation: {
                en: "RCON port number",
                ja: "RCONポート番号"
            },
            constraints: {
                min: 1,
                max: 65535
            }
        },
        "rcon.password": {
            type: "string",
            default: "",
            required: false,
            explanation: {
                en: "RCON password",
                ja: "RCONパスワード"
            },
            constraints: {
                minLength: 0,
                maxLength: 255
            }
        },
        "enable-query": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Enable GameSpy4 protocol server listener",
                ja: "GameSpy4プロトコルのサーバーリスナーを有効化"
            },
            constraints: {}
        },
        "query.port": {
            type: "number",
            default: 25565,
            required: true,
            explanation: {
                en: "Query port number",
                ja: "Queryポート番号"
            },
            constraints: {
                min: 1,
                max: 65535
            }
        },
        "enable-jmx-monitoring": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Expose JMX monitoring interface",
                ja: "JMX監視インターフェースを公開します"
            },
            constraints: {}
        },
        "network-compression-threshold": {
            type: "number",
            default: 256,
            required: true,
            explanation: {
                en: "Packet compression threshold in bytes (-1 = disabled)",
                ja: "パケット圧縮の閾値（バイト数、-1=無効）"
            },
            constraints: {
                min: -1,
                max: 65535
            }
        },
        "max-tick-time": {
            type: "number",
            default: 60000,
            required: true,
            explanation: {
                en: "Maximum tick time in milliseconds before watchdog crash",
                ja: "ウォッチドッグクラッシュまでの最大Tick時間（ミリ秒）"
            },
            constraints: {
                min: -1,
                max: 2147483647
            }
        },
        "max-chained-neighbor-updates": {
            type: "number",
            default: 1000000,
            required: true,
            explanation: {
                en: "Limit of consecutive neighbor updates",
                ja: "連続した近隣ブロック更新の上限"
            },
            constraints: {
                min: 0,
                max: 2147483647
            }
        },
        "rate-limit": {
            type: "number",
            default: 0,
            required: true,
            explanation: {
                en: "Packet rate limit (0 = unlimited)",
                ja: "パケットレート制限（0=無制限）"
            },
            constraints: {
                min: 0,
                max: 2147483647
            }
        },
        "sync-chunk-writes": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Write chunks synchronously",
                ja: "チャンクを同期的に書き込みます"
            },
            constraints: {}
        },
        "use-native-transport": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Use optimized packet sending/receiving on Linux",
                ja: "Linux上で最適化されたパケット送受信を使用します"
            },
            constraints: {}
        },
        "prevent-proxy-connections": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Prevent players from using proxies",
                ja: "プレイヤーのプロキシ使用を防止します"
            },
            constraints: {}
        },
        "enable-status": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Enable server list status",
                ja: "サーバーリストステータスを有効化します"
            },
            constraints: {}
        },
        "hide-online-players": {
            type: "boolean",
            default: false,
            required: true,
            explanation: {
                en: "Hide online player list in server status",
                ja: "サーバーステータスでオンラインプレイヤーリストを非表示"
            },
            constraints: {}
        },
        "broadcast-console-to-ops": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Broadcast console output to ops",
                ja: "コンソール出力をOP権限者に通知します"
            },
            constraints: {}
        },
        "broadcast-rcon-to-ops": {
            type: "boolean",
            default: true,
            required: true,
            explanation: {
                en: "Broadcast RCON output to ops",
                ja: "RCON出力をOP権限者に通知します"
            },
            constraints: {}
        },
        "function-permission-level": {
            type: "number",
            default: 2,
            required: true,
            explanation: {
                en: "Permission level for functions (1-4)",
                ja: "ファンクション実行の権限レベル（1-4）"
            },
            constraints: {
                min: 1,
                max: 4
            }
        }
    }
};

/**
 * Get property icons for UI display
 */
export const propertyIcons = {
    "motd": "fa-comment-dots",
    "max-players": "fa-users",
    "difficulty": "fa-shield-alt",
    "gamemode": "fa-gamepad",
    "hardcore": "fa-skull",
    "pvp": "fa-crossed-swords",
    "allow-nether": "fa-fire",
    "spawn-monsters": "fa-ghost",
    "spawn-animals": "fa-paw",
    "spawn-npcs": "fa-user-tie",
    "level-name": "fa-folder",
    "level-seed": "fa-seedling",
    "level-type": "fa-mountain",
    "white-list": "fa-list-check",
    "view-distance": "fa-eye",
    "simulation-distance": "fa-cube",
    "spawn-protection": "fa-home",
    "allow-flight": "fa-plane",
    "force-gamemode": "fa-lock",
    "generate-structures": "fa-building",
    "max-world-size": "fa-globe",
    "player-idle-timeout": "fa-clock",
    "online-mode": "fa-shield-check",
    "enable-command-block": "fa-terminal",
    "op-permission-level": "fa-user-shield",
    "enforce-whitelist": "fa-gavel",
    "require-resource-pack": "fa-box",
    "resource-pack": "fa-download",
    "resource-pack-prompt": "fa-message",
    "resource-pack-sha1": "fa-fingerprint",
    "generator-settings": "fa-cog",
    "initial-enabled-packs": "fa-layer-group",
    "server-ip": "fa-network-wired",
    "server-port": "fa-ethernet",
    "enable-rcon": "fa-terminal",
    "rcon.port": "fa-plug",
    "rcon.password": "fa-key",
    "enable-query": "fa-question-circle",
    "query.port": "fa-ethernet",
    "enable-jmx-monitoring": "fa-chart-line",
    "network-compression-threshold": "fa-compress",
    "max-tick-time": "fa-stopwatch",
    "max-chained-neighbor-updates": "fa-link",
    "rate-limit": "fa-tachometer-alt",
    "sync-chunk-writes": "fa-sync",
    "use-native-transport": "fa-rocket",
    "prevent-proxy-connections": "fa-ban",
    "enable-status": "fa-signal",
    "hide-online-players": "fa-eye-slash",
    "broadcast-console-to-ops": "fa-broadcast-tower",
    "broadcast-rcon-to-ops": "fa-broadcast-tower",
    "function-permission-level": "fa-function"
};

