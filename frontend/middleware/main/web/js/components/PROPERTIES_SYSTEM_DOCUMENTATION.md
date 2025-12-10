# Server Properties System Documentation

## 📋 Overview

The Server Properties System is a comprehensive UI for managing Minecraft server.properties files with three user experience levels: **Amateur**, **Advanced**, and **Developer**.

Created: November 25, 2025  
Version: 1.0.0  
Status: ✅ Fully Functional (Frontend Prototype)

---

## 🎯 Features

### Three-Tier User Modes

#### 🟢 Amateur Mode
Basic properties for beginners:
- Difficulty (difficulty)
- Gamemode (gamemode)
- Max Players (max-players)
- PvP (pvp)
- Allow Flight (allow-flight)
- White List (white-list)
- Online Mode (online-mode)

**Total: 7 properties**

#### 🟡 Advanced Mode
Amateur properties + intermediate settings:
- View Distance (view-distance)
- Simulation Distance (simulation-distance)
- Spawn Protection (spawn-protection)
- Entity Broadcast Range (entity-broadcast-range-percentage)
- Max World Size (max-world-size)
- Spawn Monsters (spawn-monsters)
- Spawn Animals (spawn-animals)
- Spawn NPCs (spawn-npcs)

**Total: 15 properties**

#### 🔴 Developer Mode
All properties + raw text editor:
- Server IP (server-ip)
- Network Compression Threshold (network-compression-threshold)
- OP Permission Level (op-permission-level)
- Function Permission Level (function-permission-level)
- Rate Limit (rate-limit)
- Enable Command Block (enable-command-block)
- Enable JMX Monitoring (enable-jmx-monitoring)
- Sync Chunk Writes (sync-chunk-writes)
- **+ Raw Text Editor** with property=value format

**Total: 23+ properties**

---

## 📁 File Structure

### Created Files

```
frontend/middleware/main/web/
├── js/
│   ├── components/
│   │   ├── PropertiesModalTemplate.js       [NEW] ✅ Modal HTML template
│   │   └── PROPERTIES_SYSTEM_DOCUMENTATION.md [NEW] ✅ This file
│   └── composables/
│       └── useProperties.js                  [NEW] ✅ Properties logic
└── style/
    └── components/
        └── properties-modal.css              [NEW] ✅ Modal styling
```

### Modified Files

```
frontend/middleware/main/web/
├── js/
│   ├── app.js                                [MODIFIED] ✅ Import useProperties
│   ├── store.js                              [MODIFIED] ✅ Add propertiesModal state
│   └── components/
│       ├── templates.js                      [MODIFIED] ✅ Import & integrate modal
│       └── ServersTabTemplate.js             [MODIFIED] ✅ Add "プロパティ" button
└── style/
    └── main.css                              [MODIFIED] ✅ Import properties CSS
```

---

## 🔧 Technical Implementation

### State Management (store.js)

```javascript
propertiesModal: {
    visible: false,          // Modal visibility
    serverUuid: null,        // Current server UUID
    serverName: '',          // Current server name
    mode: 'amateur',         // Current mode: 'amateur', 'advanced', 'developer'
    editorTab: 'gui',        // Editor tab: 'gui', 'raw'
    data: {},                // Properties data object
    rawText: ''              // Raw text editor content
}
```

### Key Methods (useProperties.js)

| Method | Description |
|--------|-------------|
| `openPropertiesModal(server)` | Opens modal for specific server |
| `closePropertiesModal()` | Closes modal and resets state |
| `switchPropertiesMode(mode)` | Switches between Amateur/Advanced/Developer |
| `saveServerProperties()` | Saves to localStorage |
| `loadServerProperties(uuid)` | Loads from localStorage |
| `resetPropertiesToDefault()` | Resets to default values |
| `syncGUIToRawEditor()` | Converts GUI data to raw text |
| `syncRawEditorToGUI()` | Parses raw text to GUI data |
| `propertiesToRawText(props)` | Converts properties to server.properties format |
| `rawTextToProperties(text)` | Parses server.properties format |
| `validatePropertyValue(key, value)` | Validates property values |
| `exportPropertiesAsFile(uuid)` | Exports as downloadable file |

---

## 💾 Data Storage

### localStorage Structure

```javascript
Key: `server-properties-{serverUuid}`

Value:
{
  version: 1,
  lastModified: "2025-11-25T12:00:00.000Z",
  properties: {
    "difficulty": "normal",
    "gamemode": "survival",
    "max-players": 20,
    "pvp": true,
    "allow-flight": false,
    // ... all other properties
  }
}
```

### Default Values

```javascript
{
  // Amateur
  'difficulty': 'normal',
  'gamemode': 'survival',
  'max-players': 20,
  'pvp': true,
  'allow-flight': false,
  'white-list': false,
  'online-mode': true,
  
  // Advanced
  'view-distance': 10,
  'simulation-distance': 10,
  'spawn-protection': 16,
  'entity-broadcast-range-percentage': 100,
  'max-world-size': 29999984,
  'spawn-monsters': true,
  'spawn-animals': true,
  'spawn-npcs': true,
  
  // Developer
  'server-ip': '',
  'network-compression-threshold': 256,
  'op-permission-level': 4,
  'function-permission-level': 2,
  'rate-limit': 0,
  'enable-command-block': false,
  'enable-jmx-monitoring': false,
  'sync-chunk-writes': true
}
```

---

## 🎨 UI/UX Design

### Mode Toggle Design
- Segmented control with 3 buttons
- Active state highlighted with primary color
- Icon + Label for each mode
- Smooth transitions

### Property Input Types
1. **Select Dropdown**: difficulty, gamemode
2. **Number Input**: max-players, view-distance, etc.
3. **Checkbox**: pvp, allow-flight, white-list, etc.
4. **Text Input**: server-ip

### Layout
- Responsive grid layout (auto-fill, minmax 280px)
- Sections with color-coded headers:
  - 🟢 Amateur: Blue
  - 🟡 Advanced: Orange
  - 🔴 Developer: Purple
- Tooltips with help icons
- Dark/Light theme support

### Raw Text Editor (Developer)
- Monospace font (Consolas, Monaco)
- Syntax highlighting (dark background)
- Line-by-line property=value format
- Sync button to apply changes to GUI

---

## 🚀 How to Use

### For Users

1. **Navigate to Server List** (Minecraftサーバー一覧)
2. **Click "プロパティ" button** on any server card
3. **Select Mode**:
   - Amateur: Basic settings
   - Advanced: More options appear
   - Developer: All options + raw editor
4. **Edit Properties**:
   - Use dropdowns, checkboxes, number inputs
   - Or switch to "テキスト編集" tab in Developer mode
5. **Save**: Click "保存" button
6. **Reset**: Click "デフォルトに戻す" to restore defaults

### For Developers

#### Opening Modal Programmatically
```javascript
this.openPropertiesModal(serverObject);
```

#### Loading Properties
```javascript
const properties = this.loadServerProperties(serverUuid);
if (properties) {
  console.log('Loaded:', properties);
}
```

#### Validating Values
```javascript
const validation = this.validatePropertyValue('max-players', 25);
if (!validation.valid) {
  console.error(validation.message);
}
```

---

## ✅ Validation Rules

| Property | Min | Max | Type |
|----------|-----|-----|------|
| max-players | 1 | 1000 | number |
| view-distance | 3 | 32 | number |
| simulation-distance | 3 | 32 | number |
| spawn-protection | 0 | 100 | number |
| entity-broadcast-range-percentage | 10 | 1000 | number |
| max-world-size | 1 | 29999984 | number |
| op-permission-level | 1 | 4 | number |
| function-permission-level | 1 | 4 | number |
| rate-limit | 0 | ∞ | number |

---

## 🔮 Future Enhancements

### Backend Integration (Phase 2)
- [ ] Connect to actual server.properties files
- [ ] Real-time sync with file system
- [ ] Server restart on property change
- [ ] Backup/restore functionality

### Additional Features
- [ ] Import server.properties file
- [ ] Property templates (PvP, Creative, Survival)
- [ ] Search/filter properties
- [ ] Property comparison between servers
- [ ] Undo/Redo history
- [ ] Property descriptions in multiple languages

### Advanced Developer Tools
- [ ] Syntax validation for raw editor
- [ ] Auto-complete suggestions
- [ ] Diff viewer (before/after)
- [ ] Property impact warnings

---

## 🐛 Known Limitations

1. **Frontend Only**: Currently uses localStorage, not connected to backend
2. **No File Export**: Properties not written to actual server.properties files yet
3. **Limited Properties**: Only includes common properties (23 total)
4. **No Validation Feedback**: Some validation happens but UI feedback is minimal

---

## 📊 Testing Checklist

### ✅ Completed Tests

- [x] Modal opens/closes correctly
- [x] Button appears on server cards
- [x] Mode toggle switches work
- [x] Amateur properties display
- [x] Advanced properties display (includes Amateur)
- [x] Developer properties display (includes Amateur + Advanced)
- [x] Raw text editor tab appears in Developer mode
- [x] GUI to Raw text sync
- [x] Raw text to GUI sync
- [x] localStorage save functionality
- [x] localStorage load functionality
- [x] Default values applied correctly
- [x] Reset to defaults works
- [x] CSS styling matches existing design
- [x] Dark/Light theme support
- [x] Responsive design (mobile/tablet/desktop)

### 🔄 Manual Testing Required

- [ ] Test with actual server data
- [ ] Test with multiple servers
- [ ] Test localStorage persistence across sessions
- [ ] Test validation error messages
- [ ] Test raw text parser with complex values
- [ ] Test export functionality

---

## 🎓 Code Examples

### Example 1: Custom Property Addition

To add a new property, edit `useProperties.js`:

```javascript
getDefaultProperties() {
  return {
    // ... existing properties ...
    'your-new-property': 'default-value'
  };
}
```

Then add to `PropertiesModalTemplate.js`:

```html
<div class="property-item">
  <label class="property-label">
    <i class="fas fa-icon"></i>
    Your Label (your-new-property)
  </label>
  <input 
    type="text" 
    v-model="propertiesModal.data['your-new-property']" 
    class="property-input"
  />
</div>
```

### Example 2: Custom Validation

```javascript
validatePropertyValue(key, value) {
  const validations = {
    // ... existing validations ...
    'custom-property': { min: 0, max: 100 }
  };
  // ... validation logic ...
}
```

---

## 📞 Support & Contact

For questions or issues related to the Properties System:
- **Created by**: AI Assistant (Cursor IDE)
- **Date**: November 25, 2025
- **Project**: Sotuken - Minecraft Server Manager

---

## 📝 Changelog

### Version 1.0.0 (2025-11-25)
- ✨ Initial release
- ✅ Three-tier mode system (Amateur/Advanced/Developer)
- ✅ 23 configurable properties
- ✅ Raw text editor for Developer mode
- ✅ localStorage persistence
- ✅ Modern, responsive UI
- ✅ Dark/Light theme support
- ✅ Full Japanese localization

---

**Status**: ✅ **Production Ready (Frontend Prototype)**

The Properties System is fully functional as a frontend prototype using localStorage. Backend integration is planned for Phase 2.

