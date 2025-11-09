# Server Update Feature - Implementation Summary

## Overview
A comprehensive server update feature has been implemented that allows users to upgrade/downgrade Minecraft server versions, switch server software types, and manage JDK versions.

## Implementation Date
November 9, 2025

## Files Modified

### 1. `web/js/components/templates.js`
- **Line 273-281**: Added "更新" (Update) button to server card actions
  - Only visible when server is stopped
  - Calls `openUpdateModal(server)` method
  - Positioned between Start/Stop and Delete buttons

- **Line 897-1085**: Added complete Update Modal template
  - Step 1: Version Selection
    - Shows current server configuration
    - Dropdowns for new software and version selection
    - JDK requirement warning
    - Backup checkbox option
  - Step 2: Progress tracking with operations list and logs
  - Step 3: Success message
  - Step 4: Error display

### 2. `web/js/composables/useServers.js`
Added the following methods (Lines 744-988):

- `openUpdateModal(server)`: Initializes and opens the update modal
- `loadUpdateVersions()`: Loads available versions for selected software
- `checkUpdateJdk()`: Validates JDK requirements for selected version
- `startUpdate()`: Initiates the update process
- `prepareUpdateOperations()`: Creates the operations list for progress tracking
- `updateUpdateOperation(operationId, status)`: Updates operation status
- `addUpdateLog(message)`: Adds log messages to the modal
- `executeServerUpdate()`: Main update execution flow
- `backupServer(serverUuid)`: Handles server backup (with graceful 404 handling)
- `closeUpdateModal()`: Closes modal and reloads servers on success

### 3. `web/js/store.js`
- **Line 89-104**: Added `updateModal` state object
  ```javascript
  updateModal: {
      visible: false,
      step: 'select',
      server: null,
      newSoftware: '',
      newVersion: '',
      availableVersions: [],
      requiredJdk: null,
      newJdkRequired: false,
      jdkInstalled: false,
      createBackup: true,
      operations: [],
      logs: [],
      error: null
  }
  ```

## Feature Workflow

### Update Process Flow
```
1. User clicks "更新" button on stopped server
   ↓
2. Modal opens showing current configuration
   ↓
3. User selects new software/version
   ↓
4. System checks JDK requirements
   ↓
5. User clicks "更新開始" (Start Update)
   ↓
6. Progress modal shows:
   - [Optional] Backup current server
   - [If needed] Download JDK
   - [If needed] Install JDK
   - Download new server software
   - Update server instance
   ↓
7. Success/Error message displayed
   ↓
8. Server list reloads with updated information
```

## Operations Performed

### 1. Backup (Optional)
- Calls `/api/mc/backup/{serverUuid}` endpoint
- Gracefully handles 404 if endpoint doesn't exist
- Logs warning but continues update if backup fails

### 2. JDK Download & Install (If Required)
- Checks if new version requires different JDK
- Downloads JDK if not already installed
- Installs JDK using existing installation flow

### 3. Server Software Download
- Gets download URL from server list
- Downloads new server jar file
- Tracks progress via WebSocket

### 4. Server Update
- Sends PUT request to `/api/servers/{uuid}`
- Payload includes:
  ```json
  {
    "serverBinaryFilePath": "filename.jar",
    "software": {
      "name": "Paper",
      "version": "1.20.1"
    },
    "jdkVersion": 17
  }
  ```

## Backend Requirements

The backend needs to support the following endpoints:

### Required Endpoint
- **PUT** `/api/servers/{uuid}` - Update server
  - Must accept `serverBinaryFilePath`, `software`, and optional `jdkVersion`
  - Should preserve world data and configurations
  - Should replace server jar file
  - Should update server metadata

### Optional Endpoint
- **POST** `/api/mc/backup/{uuid}` - Backup server
  - Creates backup before update
  - Returns 404 if not implemented (gracefully handled)

## Key Features

### Safety Features
1. **Server Must Be Stopped**: Update button only appears when server is stopped
2. **Backup Option**: Optional backup creation before update (enabled by default)
3. **Confirmation**: Shows current vs new configuration before proceeding
4. **Progress Tracking**: Real-time progress updates with detailed logs
5. **Error Handling**: Clear error messages if update fails

### Flexibility
1. **Version Upgrade/Downgrade**: Can move to any available version
2. **Software Change**: Can switch between different server types (e.g., Vanilla → Paper)
3. **JDK Management**: Automatically handles JDK version changes
4. **Backup Control**: User can choose to skip backup if desired

### User Experience
1. **Visual Progress**: Step-by-step operations with status indicators
2. **Detailed Logs**: Timestamped log messages showing what's happening
3. **Current Config Display**: Shows current settings vs new settings
4. **JDK Warnings**: Alerts user if JDK update is required
5. **Japanese UI**: All text in Japanese for consistency

## Testing Checklist

### Basic Tests
- [ ] Update button appears on stopped servers
- [ ] Update button hidden on running servers
- [ ] Modal opens when clicking update button
- [ ] Current server info displays correctly
- [ ] Software dropdown populated from server list
- [ ] Version dropdown populated for selected software
- [ ] Current version marked with "(現在)" label

### Version Update Tests
- [ ] Same software, newer version (e.g., Paper 1.19 → 1.20)
- [ ] Same software, older version (e.g., Paper 1.20 → 1.19)
- [ ] Different software, same version (e.g., Vanilla 1.19 → Paper 1.19)
- [ ] Different software, different version

### JDK Tests
- [ ] JDK warning appears when version requires different JDK
- [ ] JDK download triggered when not installed
- [ ] JDK installation completes successfully
- [ ] No JDK operations when already installed

### Progress & Error Tests
- [ ] Progress bar updates during operations
- [ ] Logs display in real-time
- [ ] Success modal displays on completion
- [ ] Error modal displays on failure
- [ ] Server list reloads after successful update

### Edge Cases
- [ ] Cancel during version selection
- [ ] Backup endpoint returns 404 (should skip gracefully)
- [ ] Backup fails (should log warning and continue)
- [ ] Network error during download
- [ ] Invalid version selection
- [ ] WebSocket disconnection during update

## Known Limitations

1. **Backup Endpoint Optional**: The backup feature assumes an endpoint exists but handles 404 gracefully
2. **No Rollback**: If update fails partway through, manual intervention may be needed
3. **Single Update**: Cannot update multiple servers simultaneously
4. **No Version Validation**: Doesn't check Minecraft version compatibility

## Future Enhancements

Potential improvements for future versions:

1. **Automatic Backup**: Create backups automatically before any update
2. **Rollback Feature**: Allow reverting to previous version if update fails
3. **Batch Updates**: Update multiple servers at once
4. **Version Comparison**: Show changelog between versions
5. **Update Schedule**: Schedule updates for specific times
6. **Compatibility Check**: Verify plugin compatibility before update
7. **Dry Run**: Test update without actually applying changes

## Usage Example

### For End Users:

1. Navigate to "サーバー一覧" (Server List)
2. Find a stopped server you want to update
3. Click the blue "更新" (Update) button
4. Review current configuration in the modal
5. Select new software/version from dropdowns
6. Check JDK warning if applicable
7. Ensure "バックアップを作成" is checked (recommended)
8. Click "更新開始" (Start Update)
9. Wait for progress to complete
10. Click "閉じる" (Close) when done

### For Developers:

The update system integrates seamlessly with existing infrastructure:
- Uses same download system as server creation
- Uses same JDK installation flow
- Uses existing WebSocket for progress updates
- Uses existing API endpoints pattern

## Code Quality

- ✅ No linting errors
- ✅ Consistent with existing code style
- ✅ Japanese language UI maintained
- ✅ Error handling implemented
- ✅ Progress tracking included
- ✅ Graceful degradation for missing features

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify backend endpoints are implemented
3. Check WebSocket connection is active
4. Ensure server is stopped before updating
5. Review logs in the progress modal

---

**Implementation completed successfully!** 🎉

The server update feature is now fully integrated and ready for testing.

