# Vue Application Templates - Modular Structure

This directory contains a modular organization of Vue application templates for the Minecraft Server Manager.

## 📁 File Structure

### Main Entry Point
- **`templates.js`** - Base file that imports and combines all modular templates

### Template Modules

#### Core UI Components
- **`LoadingTemplate.js`** - Loading overlay screen
- **`AuthTemplate.js`** - Authentication screens (signup/login)
- **`NavbarTemplate.js`** - Top navigation bar with notifications and user menu
- **`SidebarTemplate.js`** - Sidebar navigation menu
- **`DashboardHeaderTemplate.js`** - Dashboard header with title and message areas

#### Content Tabs
- **`ServersTabTemplate.js`** - Server list and management tab
- **`CreateServerTabTemplate.js`** - Server creation and editing form
- **`SettingsTabTemplate.js`** - System settings tab
- **`DownloadsTabTemplate.js`** - Download management tab
- **`ContentTabsTemplate.js`** - About Us and Tutorials tabs
- **`JdkManagementTabTemplate.js`** - JDK management tab

#### UI Components
- **`ModalsTemplate.js`** - All modal dialogs (creation, update, console, delete confirmation, help)
- **`ToastTemplate.js`** - Toast notification system

## 🎯 Benefits of This Structure

1. **Maintainability**: Each component is isolated in its own file
2. **Readability**: Easier to navigate and understand specific sections
3. **Collaboration**: Multiple developers can work on different templates simultaneously
4. **Debugging**: Quickly locate and fix issues in specific components
5. **Scalability**: Easy to add new templates or modify existing ones

## 📝 Usage

All templates are automatically imported and combined in `templates.js`:

```javascript
import { loadingTemplate } from './LoadingTemplate.js';
import { authTemplate } from './AuthTemplate.js';
// ... other imports

export const appTemplate = `
  ${loadingTemplate}
  ${authTemplate}
  // ... combined templates
`;
```

## ⚠️ Important Notes

- **Do not modify** the functionality or UI of existing templates
- **Preserve** all code logic and Vue directives
- Each file exports a single template string
- Templates use ES6 template literals for multi-line strings

## 🔧 Maintenance Guidelines

When modifying templates:
1. Locate the specific template file you need to edit
2. Make changes within that file only
3. Test the changes to ensure functionality is preserved
4. The main `templates.js` file automatically includes your updates

## 📊 Template Organization

```
components/
├── templates.js                    (Main entry - 90 lines)
├── LoadingTemplate.js             (6 lines)
├── AuthTemplate.js                (100 lines)
├── NavbarTemplate.js              (100 lines)
├── SidebarTemplate.js             (18 lines)
├── DashboardHeaderTemplate.js     (21 lines)
├── ServersTabTemplate.js          (128 lines)
├── CreateServerTabTemplate.js     (202 lines)
├── SettingsTabTemplate.js         (48 lines)
├── DownloadsTabTemplate.js        (256 lines)
├── ContentTabsTemplate.js         (24 lines)
├── JdkManagementTabTemplate.js    (108 lines)
├── ModalsTemplate.js              (483 lines)
└── ToastTemplate.js               (18 lines)
```

## 🚀 Quick Reference

| Template File | Purpose | Key Features |
|--------------|---------|--------------|
| LoadingTemplate | Loading screen | Spinner, loading message |
| AuthTemplate | User authentication | Signup/login forms, form validation |
| NavbarTemplate | Top navigation | Notifications, theme toggle, user menu |
| SidebarTemplate | Side navigation | Tab switching, menu items |
| ServersTabTemplate | Server management | Server cards, status indicators, actions |
| CreateServerTabTemplate | Server form | Configuration fields, validation, preview |
| SettingsTabTemplate | System settings | API testing, configuration |
| DownloadsTabTemplate | Download manager | WebSocket status, download progress |
| ContentTabsTemplate | Static content | Markdown rendering for About/Tutorials |
| JdkManagementTabTemplate | JDK management | JDK list, usage tracking, deletion |
| ModalsTemplate | Dialog windows | Creation wizard, edit forms, console |
| ToastTemplate | Notifications | Success/error/warning messages |

---

**Last Updated**: 2025-11-21  
**Structure Version**: 1.0  
**Original File**: templates.js (1326 lines) → Modular structure (13 files)

