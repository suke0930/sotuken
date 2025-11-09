# Server Update Feature - Quick Start Guide

## ✅ Implementation Complete!

The server update feature has been successfully implemented in your Minecraft server management system.

## 🎯 What Was Added

### 1. Update Button
- Blue "更新" (Update) button added to each server card
- Only visible when server is **stopped**
- Located between Start/Stop and Delete buttons

### 2. Update Modal
A complete modal interface with 4 steps:
- **Select**: Choose new software and version
- **Progress**: Real-time progress tracking
- **Complete**: Success confirmation
- **Error**: Error handling and messages

### 3. Backend Integration
- Automatic JDK version management
- Optional server backup before update
- Progress tracking via WebSocket
- Server metadata update

## 🚀 How to Use

### Simple Update Process:

1. **Stop your server** (if running)
2. Click the blue **"更新"** button
3. Select new software/version from dropdowns
4. Review JDK requirements (if any)
5. Keep backup option checked ✓ (recommended)
6. Click **"更新開始"** to start
7. Watch the progress
8. Click **"閉じる"** when complete

## 📋 Update Scenarios

### ✅ Supported Updates:
- **Version Upgrade**: Paper 1.19 → Paper 1.20
- **Version Downgrade**: Paper 1.20 → Paper 1.19
- **Software Switch**: Vanilla 1.19 → Paper 1.19
- **Combined Change**: Vanilla 1.19 → Paper 1.20

### 🔄 What Gets Updated:
- ✓ Server jar file
- ✓ Software type and version metadata
- ✓ JDK version (if required)

### 📦 What's Preserved:
- ✓ World data
- ✓ Server configurations
- ✓ Player data
- ✓ Plugins/Mods
- ✓ Server settings

## 🛡️ Safety Features

1. **Backup Option**: Creates backup before updating (optional)
2. **JDK Auto-Management**: Automatically downloads/installs required JDK
3. **Progress Tracking**: See exactly what's happening
4. **Error Recovery**: Clear error messages if something fails
5. **Stopped Server Only**: Prevents updating running servers

## 🎨 UI Preview

### Server Card with Update Button:
```
┌─────────────────────────────────┐
│ 🟢 稼働中 / 🔴 停止中           │
│ My Minecraft Server             │
│ Version: 1.19.4                 │
│ Software: Paper                 │
│ JDK: 17                         │
│                                 │
│ [▶ 起動] [↑ 更新] [🗑 削除]    │ ← Update button here!
└─────────────────────────────────┘
```

### Update Modal:
```
┌────────────────────────────────────┐
│ ↑ サーバーを更新            [✕]  │
├────────────────────────────────────┤
│                                    │
│ 現在の設定                         │
│ ┌────────────────────────────────┐│
│ │ サーバー: My Server            ││
│ │ ソフトウェア: Paper            ││
│ │ バージョン: 1.19.4             ││
│ │ JDK: 17                        ││
│ └────────────────────────────────┘│
│                                    │
│ 新しいサーバーソフトウェア         │
│ ┌─────────────────────────────┐  │
│ │ Paper ▼                      │  │
│ └─────────────────────────────┘  │
│                                    │
│ 新しいバージョン                   │
│ ┌─────────────────────────────┐  │
│ │ 1.20.1 ▼                     │  │
│ └─────────────────────────────┘  │
│                                    │
│ ☑ 更新前にバックアップを作成する   │
│                                    │
│    [キャンセル]  [↑ 更新開始]     │
└────────────────────────────────────┘
```

## 🔧 Technical Details

### Files Modified:
1. `web/js/components/templates.js` - UI components
2. `web/js/composables/useServers.js` - Update logic
3. `web/js/store.js` - State management

### New Methods Added:
- `openUpdateModal()`
- `loadUpdateVersions()`
- `checkUpdateJdk()`
- `startUpdate()`
- `executeServerUpdate()`
- `backupServer()`
- `closeUpdateModal()`

### API Endpoints Used:
- `PUT /api/servers/{uuid}` - Update server
- `POST /api/mc/backup/{uuid}` - Backup (optional)
- Existing download and JDK endpoints

## ⚠️ Important Notes

1. **Server Must Be Stopped**: Cannot update running servers
2. **Backup Recommended**: Always create backup before major updates
3. **JDK Auto-Install**: System automatically handles JDK changes
4. **One at a Time**: Update one server at a time
5. **Backend Required**: Backend must support the update endpoint

## 🧪 Testing

### Test Cases to Verify:
- [ ] Update button visible on stopped servers
- [ ] Modal opens with correct current settings
- [ ] Software dropdown shows all options
- [ ] Version dropdown updates when software changes
- [ ] JDK warning appears when needed
- [ ] Progress updates in real-time
- [ ] Success message on completion
- [ ] Server list refreshes automatically

## 📊 Progress Steps

When you start an update, you'll see these operations:

1. **📦 バックアップ** (if enabled)
2. **☕ JDK ダウンロード** (if needed)
3. **☕ JDK インストール** (if needed)
4. **📥 サーバーダウンロード**
5. **🔄 サーバー更新**

Each step shows:
- ⚪ Pending (gray circle)
- 🔵 Running (blue spinner)
- ✅ Completed (green checkmark)

## 🎉 Success!

Your server update feature is now ready to use!

### Next Steps:
1. Open your application in a browser
2. Navigate to サーバー一覧 (Server List)
3. Try updating a test server
4. Verify the update completed successfully

## 💡 Tips

- **Before Update**: Make sure you have enough disk space
- **During Update**: Don't close the browser or refresh the page
- **After Update**: Check server logs to verify it starts correctly
- **Testing**: Test with a development server first

## 🐛 Troubleshooting

### Update button not showing?
→ Make sure server is stopped

### Modal opens but no versions?
→ Check if server list is loaded properly

### Update fails immediately?
→ Check backend API endpoint is implemented

### JDK download takes long?
→ Normal for first-time JDK installations

### Backup fails?
→ Backup is optional, update will continue

## 📚 Documentation

For detailed implementation information, see:
- `SERVER_UPDATE_IMPLEMENTATION.md` - Complete technical documentation

---

**Enjoy your new server update feature!** 🚀

