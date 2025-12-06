# 🎛️ Server Properties - Quick Start Guide

Updated: 2025-12-06

```mermaid
flowchart LR
    Open[Open modal] --> Edit[GUI / Raw edit]
    Edit --> Validate[Validate & sanitize]
    Validate --> API[POST /api/mc/Properties/{uuid}]
    Validate --> Local[(localStorage v2<br/>no RCON password)]
    API -.failure.-> Fallback[Show warning banner + defaults/backup]
```

## Access
1) Go to **Minecraftサーバー一覧**  
2) Click the **「プロパティ」** button on a server card  
3) Edit in GUI or switch to **Developer → テキスト編集**

## Modes (independent)
- 🟢 **Basic (14 items)**: motd, max-players, difficulty, gamemode, hardcore, pvp, allow-nether, spawn-monsters, spawn-animals, spawn-npcs, level-name, level-seed, level-type, white-list  
- 🟠 **Advanced (18 items)**: view-distance, simulation-distance, spawn-protection, allow-flight, force-gamemode, generate-structures, max-world-size, player-idle-timeout, online-mode, enable-command-block, op-permission-level, enforce-whitelist, require-resource-pack, resource-pack, resource-pack-prompt, resource-pack-sha1, generator-settings, initial-enabled-packs  
- 🔴 **Developer (20 items + raw editor)**: server-ip, server-port, enable-rcon, rcon.port, rcon.password, enable-query, query.port, enable-jmx-monitoring, network-compression-threshold, max-tick-time, max-chained-neighbor-updates, rate-limit, sync-chunk-writes, use-native-transport, prevent-proxy-connections, enable-status, hide-online-players, broadcast-console-to-ops, broadcast-rcon-to-ops, function-permission-level  
  - Raw editor shows validation overlays; press **GUIに反映** to sync back.

## Saving behavior
- Values are validated (range/enum/format). Unknown keys from raw editor are warned and **not sent** to the API.
- POST to `/api/mc/Properties/{uuid}` uses stringified values. If the API is unreachable, the modal keeps defaults/backup and shows a warning banner.
- A sanitized backup is stored in `localStorage` (`server-properties-{uuid}`, version 2). `rcon.password` is **never persisted**; you must re-enter it after reload if the API is down.

### Backup format
```json
{
  "version": 2,
  "lastModified": "2025-12-06T12:00:00.000Z",
  "properties": {
    "motd": "A Minecraft Server",
    "max-players": 20,
    "...": "other schema properties"
  }
}
```

## Tips
- Counts in the header should read **14 / 18 / 20**; switch modes to edit each tier (they do not inherit).
- In Developer mode, fix raw editor errors before saving; warnings are allowed but highlighted.
- Sensitive data (RCON password) is memory-only; take care when using shared machines.
