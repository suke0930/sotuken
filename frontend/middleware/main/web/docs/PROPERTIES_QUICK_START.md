# 🎛️ Server Properties - Quick Start Guide

## ✅ Installation Complete!

The Server Properties System has been successfully installed and is ready to use.

---

## 🚀 How to Access

### Step 1: Go to Server List
Navigate to **"Minecraftサーバー一覧"** tab in your application.

### Step 2: Find the New Button
On each server card, you'll now see a new **"プロパティ"** button:

```
[コンソール] [プロパティ] [編集] [削除]
              ↑ NEW!
```

### Step 3: Click to Open
Click the **"プロパティ"** button to open the properties modal.

---

## 🎮 Three User Modes

### 🟢 Amateur Mode
**For beginners** - Shows only essential properties:
- Difficulty (難易度)
- Gamemode (ゲームモード)
- Max Players (最大プレイヤー数)
- PvP, Flight, Whitelist, etc.

**7 properties total**

---

### 🟡 Advanced Mode
**For intermediate users** - Shows Amateur + additional settings:
- View Distance (描画距離)
- Simulation Distance (シミュレーション距離)
- Spawn Protection (スポーン保護範囲)
- Entity Broadcast Range
- And more...

**15 properties total**

---

### 🔴 Developer Mode
**For experts** - Shows all properties + raw editor:
- Network settings
- Command blocks
- JMX monitoring
- **Plus**: Raw text editor for direct editing

**23+ properties + raw editor**

---

## 💡 Features Highlights

### ✨ Mode Switching
Toggle between modes with **one click** at the top of the modal:

```
[Amateur] [Advanced] [Developer]
```

Properties **cascade**: Advanced includes Amateur, Developer includes both.

### 📝 Raw Text Editor (Developer Only)
Switch between **GUI** and **Text** tabs:
- **GUI編集**: Visual form interface
- **テキスト編集**: Direct server.properties editing

Format: `property=value` (one per line)

### 💾 Auto-Save to localStorage
All changes are saved to `localStorage` with format:
```
Key: server-properties-{serverUUID}
```

### 🔄 Reset to Defaults
Click **"デフォルトに戻す"** to restore all properties to default values.

---

## 📋 Example Workflow

1. **Open Modal**: Click プロパティ button on server card
2. **Select Mode**: Choose Amateur/Advanced/Developer
3. **Edit Properties**: 
   - Use dropdowns for difficulty/gamemode
   - Check/uncheck boxes for boolean values
   - Enter numbers for max-players, view-distance, etc.
4. **Switch to Raw (Optional)**: In Developer mode, use text editor
5. **Save**: Click "保存" button
6. **Close**: Modal closes, properties saved to localStorage

---

## 🎨 UI Features

### Visual Design
- ✅ Clean, modern modal interface
- ✅ Color-coded sections (Blue/Orange/Purple)
- ✅ Tooltips with help icons
- ✅ Responsive grid layout
- ✅ Dark/Light theme support

### Input Types
- **Dropdown**: Select from predefined options
- **Number**: Spinners with min/max validation
- **Checkbox**: Toggle on/off
- **Text**: Free-form input

---

## 🔧 Technical Details

### Files Created
```
✅ PropertiesModalTemplate.js    - Modal HTML
✅ useProperties.js               - Logic & methods
✅ properties-modal.css           - Styling
✅ Documentation files            - This guide
```

### Files Modified
```
✅ ServersTabTemplate.js          - Added button
✅ templates.js                   - Imported modal
✅ app.js                         - Added methods
✅ store.js                       - Added state
✅ main.css                       - Imported CSS
```

---

## 📦 Data Structure

### Stored Format (localStorage)
```json
{
  "version": 1,
  "lastModified": "2025-11-25T12:00:00.000Z",
  "properties": {
    "difficulty": "normal",
    "gamemode": "survival",
    "max-players": 20,
    "pvp": true,
    "allow-flight": false,
    "view-distance": 10,
    "spawn-protection": 16,
    ...
  }
}
```

---

## ⚡ Quick Tips

### Tip 1: Tooltips
Hover over the **ⓘ** icon next to each property label to see a description.

### Tip 2: Mode Memory
The modal remembers your last selected mode (Amateur/Advanced/Developer).

### Tip 3: Raw Editor Sync
In Developer mode:
- Changes in GUI → Automatically sync to raw text
- Changes in raw text → Click "GUIに反映" button to apply

### Tip 4: Validation
Number inputs have built-in validation:
- `max-players`: 1-1000
- `view-distance`: 3-32
- `spawn-protection`: 0-100

### Tip 5: Keyboard Shortcuts
- **Enter**: Submit form (save)
- **Escape**: Close modal (cancel)

---

## 🐛 Troubleshooting

### Modal Doesn't Open
- Check console for errors
- Ensure server object has valid `uuid` and `name`

### Properties Not Saving
- Check localStorage is enabled in browser
- Check browser console for errors
- Verify key format: `server-properties-{uuid}`

### Raw Text Parsing Error
- Ensure format is `property=value`
- One property per line
- No special characters in keys

---

## 🎯 Next Steps (Future)

Currently, this is a **frontend-only prototype**. Future enhancements will include:

- 🔄 Backend integration
- 📁 Read/write actual server.properties files
- ♻️ Server restart on property change
- 📊 Property templates (PvP, Creative, etc.)
- 🌐 Multi-language support
- 📈 Property impact analysis

---

## 📞 Need Help?

Refer to the full documentation:
```
frontend/middleware/main/web/js/components/PROPERTIES_SYSTEM_DOCUMENTATION.md
```

---

**Status**: ✅ **Ready to Use**

Enjoy the new Server Properties System! 🎉





