# Server Properties System Documentation

Updated: 2025-12-06 (aligned with PR #46 review fixes)  
Scope: Frontend schema-driven properties modal (Basic/Advanced/Developer modes + raw editor)

```mermaid
flowchart LR
    GUI[GUI inputs] --> Sanitize[Validate & sanitize]
    RAW[Raw editor] --> Sanitize
    Sanitize -->|POST /api/mc/Properties/{id}| API[(Backend API)]
    Sanitize --> Local[(localStorage backup<br/>sensitive keys removed)]
    API --> Merge[Merge with defaults]
    Local --> Merge
    Merge --> Modal[Properties modal state]
```

## Overview
- Three independent modes: **Basic (14)**, **Advanced (18)**, **Developer (20 + raw editor)**. Modes do **not** inherit each other; switch modes to edit each tier.
- Schema-driven UI using `propertiesSchema.js` (labels now explicit in schema; no string-split dependency).
- Local backup uses `localStorage` version 2 and drops sensitive fields (`rcon.password`). API failures fall back to this backup with a banner message.
- API POST sanitizes unknown keys before sending to `/api/mc/Properties/{uuid}` to avoid backend errors.

## Mode Coverage (schema)
- **Basic (14)**: motd, max-players, difficulty, gamemode, hardcore, pvp, allow-nether, spawn-monsters, spawn-animals, spawn-npcs, level-name, level-seed, level-type, white-list
- **Advanced (18)**: view-distance, simulation-distance, spawn-protection, allow-flight, force-gamemode, generate-structures, max-world-size, player-idle-timeout, online-mode, enable-command-block, op-permission-level, enforce-whitelist, require-resource-pack, resource-pack, resource-pack-prompt, resource-pack-sha1, generator-settings, initial-enabled-packs
- **Developer (20)**: server-ip, server-port, enable-rcon, rcon.port, rcon.password, enable-query, query.port, enable-jmx-monitoring, network-compression-threshold, max-tick-time, max-chained-neighbor-updates, rate-limit, sync-chunk-writes, use-native-transport, prevent-proxy-connections, enable-status, hide-online-players, broadcast-console-to-ops, broadcast-rcon-to-ops, function-permission-level  
  + Developer mode also enables the raw text editor with validation overlays.

## Data Handling
- **Default values**: Built from the schema per tier; merged into modal state on load.
- **Type handling**: API payloads are stringified; UI keeps typed values (number/boolean/string/enum).
- **Local backup**: `localStorage` key `server-properties-{uuid}` stores `{ version: 2, lastModified, properties }` with sensitive keys stripped. Existing backups are sanitized on load.
- **API contract**:
  - GET `/api/mc/Properties/{uuid}` → `{ ok, data: { [key:string]: string } }`
  - POST `/api/mc/Properties/{uuid}` → body `{ data: { [key:string]: string } }`
  - Unknown keys from raw editor are **excluded** from POST; schema-known keys only.
  - If the API is unavailable, defaults + sanitized local backup are used; a warning banner is shown.

## Validation & UX
- Labels: `propertiesSchema` now supplies `label` (auto-filled from explanations) so UI labels are stable against text changes.
- GUI inputs validate per constraints (range/length/enum). Raw editor highlights format errors, schema violations, duplicates, and unknown keys (warnings).
- Counts in modal headers use the live schema (`14 / 18 / 20`); raw editor sync runs when switching tabs.
- RCON password stays in-memory only; it is not persisted to `localStorage`.

## File Map (frontend/middleware/main/web/)
- `js/content/propertiesSchema.js` — schema + icons; label auto-fill; dev mode now includes server-ip/server-port.
- `js/composables/useProperties.js` — fetch/merge/save logic, validation, API/localStorage handling, sanitization.
- `js/components/PropertiesModalTemplate.js` — modal markup for GUI/raw editors.
- `js/store.js` — modal state definition.

## Testing Checklist
- Basic/Advanced/Developer show **14 / 18 / 20** items respectively (no cross-mode inheritance).
- Developer raw editor warns on unknown keys and prevents save on errors; switching back to GUI restores values.
- Saving drops `rcon.password` from localStorage and filters unknown keys out of API POST; API failures show fallback banner with defaults/backup.
- Vue is loaded from pinned CDN (prod build with SRI) and the modal renders without console errors.
