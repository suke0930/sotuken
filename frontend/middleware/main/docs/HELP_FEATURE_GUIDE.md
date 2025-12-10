# Help Feature Implementation Guide

## Overview
A comprehensive help system has been added to the "新しいMinecraftサーバーを作成" (Create New Minecraft Server) page. This feature displays detailed explanations in a modal popup with full markdown support, including text formatting, images, tables, and more.

---

## Features Implemented

### 1. Help Icons (?)
Help icons ("?") have been added beside the following form fields:
- **サーバー名** (Server Name)
- **サーバーソフトウェアを選択** (Server Software Selection)
- **最大メモリ** (Max Memory)

### 2. Interactive Modal Popup
When users click a help icon, a modal popup appears with:
- ✅ Markdown formatting support
- ✅ Rich text styling (bold, italic, headings, etc.)
- ✅ Images
- ✅ Tables
- ✅ Code blocks
- ✅ Blockquotes
- ✅ Lists (ordered and unordered)
- ✅ Horizontal rules
- ✅ Responsive design for mobile devices

### 3. Professional Styling
- Clean, modern design that matches the application theme
- Smooth animations and transitions
- Proper dark/light mode support
- Mobile-responsive layout
- Custom scrollbar styling

---

## Files Modified/Created

### New Files Created:
1. **`web/js/utils/helpContent.js`** - Contains all help content in markdown format
2. **`web/style/components/help-modal.css`** - Styling for help icons and modal
3. **`docs/HELP_FEATURE_GUIDE.md`** - This documentation file

### Modified Files:
1. **`web/index.html`** - Added marked.js library for markdown parsing
2. **`web/js/components/templates.js`** - Added help icons and modal template
3. **`web/js/store.js`** - Added helpModal state management
4. **`web/js/composables/useUI.js`** - Added openHelpModal() and closeHelpModal() methods
5. **`web/style/main.css`** - Imported help-modal.css
6. **`web/style/components/server-cards.css`** - Changed grid layout to 2 columns (from previous update)

---

## How to Customize Help Content

### Editing Existing Help Content

Open `web/js/utils/helpContent.js` and modify the content for each topic:

```javascript
export const helpContent = {
    serverName: {
        title: 'Your Custom Title',
        content: `
# Your Markdown Content Here

You can use:
- **Bold text**
- *Italic text*
- [Links](https://example.com)
- Images: ![Alt text](image-url)
- Tables
- Code blocks
- And more!
        `
    }
};
```

### Adding New Help Topics

1. Add a new entry to `helpContent` object:

```javascript
export const helpContent = {
    // ... existing content ...
    
    newTopic: {
        title: 'New Help Topic',
        content: `
# Your content here
        `
    }
};
```

2. Add a help icon to the corresponding form field in `templates.js`:

```html
<label for="yourField">
    Your Label
    <button type="button" class="help-icon" @click="openHelpModal('newTopic')" title="ヘルプを表示">
        <i class="fas fa-question-circle"></i>
    </button>
</label>
```

---

## Markdown Syntax Examples

### Headings
```markdown
# Heading 1
## Heading 2
### Heading 3
```

### Text Formatting
```markdown
**Bold text**
*Italic text*
~~Strikethrough~~
`Inline code`
```

### Lists
```markdown
- Unordered item 1
- Unordered item 2

1. Ordered item 1
2. Ordered item 2
```

### Tables
```markdown
| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

### Blockquotes
```markdown
> This is a blockquote
> It can span multiple lines
```

### Images
```markdown
![Alt text](https://example.com/image.jpg)
```

### Code Blocks
````markdown
```javascript
const example = "code block";
```
````

### Horizontal Rules
```markdown
---
```

---

## Current Help Content Topics

### 1. サーバー名 (Server Name)
- Explains what a server name is
- Naming conventions
- Good and bad examples
- Important notes about naming

### 2. サーバーソフトウェア (Server Software)
- Overview of different server software types
- Detailed comparison of:
  - Vanilla
  - Spigot
  - Paper
  - Purpur
- Features, pros, and cons for each
- Recommendation table by use case

### 3. 最大メモリ (Max Memory)
- Explanation of memory importance
- Memory recommendations by player count
- Plugin/Mod memory considerations
- Minimum vs Maximum memory settings
- System memory calculation
- Troubleshooting memory issues

---

## Technical Details

### Dependencies
- **marked.js** (v11.1.1) - Markdown parser library
- **Font Awesome** (v6.4.0) - For icons
- **Vue.js** (v3.3.4) - Already in use

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- IE11 not supported (uses modern CSS features)

### Performance
- Markdown parsing happens on-demand (only when modal opens)
- Lightweight CSS animations
- No impact on page load time
- Minimal memory footprint

---

## Styling Customization

### Changing Help Icon Color

Edit `web/style/components/help-modal.css`:

```css
.help-icon {
    color: var(--theme-primary); /* Change this */
}
```

### Changing Modal Width

In `web/js/components/templates.js`, find the help modal div:

```html
<div class="modal-content help-modal" style="max-width: 800px;"> <!-- Change max-width -->
```

### Customizing Markdown Styles

Edit `.help-content` styles in `web/style/components/help-modal.css`:

```css
.help-content h1 {
    font-size: 28px; /* Adjust heading size */
    color: var(--theme-text); /* Adjust color */
}
```

---

## Testing Checklist

- [ ] Help icons appear beside correct form fields
- [ ] Clicking help icon opens modal
- [ ] Modal displays formatted content correctly
- [ ] Images load properly
- [ ] Tables render correctly
- [ ] Modal closes when clicking X button
- [ ] Modal closes when clicking "閉じる" button
- [ ] Modal closes when clicking outside (overlay)
- [ ] Content is readable in light mode
- [ ] Content is readable in dark mode
- [ ] Modal is responsive on mobile devices
- [ ] Scrolling works properly for long content

---

## Future Enhancements

Potential improvements you could add:

1. **Search functionality** - Allow users to search help content
2. **Related topics** - Show related help topics at the bottom
3. **User feedback** - "Was this helpful?" buttons
4. **Multilingual support** - Add English/other language versions
5. **Video tutorials** - Embed video guides
6. **Print functionality** - Allow printing help content
7. **Bookmarks** - Let users bookmark favorite help topics
8. **Context-sensitive help** - Show relevant help based on errors

---

## Troubleshooting

### Help Icon Not Showing
- Check that Font Awesome is loaded
- Verify CSS import in main.css
- Clear browser cache

### Markdown Not Rendering
- Check browser console for marked.js errors
- Verify marked.js CDN is accessible
- Check for JavaScript errors in useUI.js

### Styling Issues
- Verify help-modal.css is imported
- Check theme variables are defined
- Inspect element in browser DevTools

### Modal Not Opening
- Check Vue.js is loaded properly
- Verify openHelpModal method exists in useUI.js
- Check browser console for errors

---

## Support

For questions or issues:
1. Check browser console for errors
2. Verify all files are properly saved
3. Clear browser cache and reload
4. Check this documentation for solutions

---

**Last Updated:** November 18, 2025
**Version:** 1.0.0

