# Improving Scrollbar Visibility in Windsurf/VSCode

Dark themes often make scrollbars hard to see. Here's how to make them more visible:

## For Windsurf/VSCode

### 1. Customize Scrollbar Colors (Recommended)
Add this to your `settings.json`:

```json
{
  "workbench.colorCustomizations": {
    "scrollbar.shadow": "#ff0000",
    "scrollbarSlider.background": "#79797966",
    "scrollbarSlider.hoverBackground": "#646464b3",
    "scrollbarSlider.activeBackground": "#bfbfbf66",
    "scrollbarSlider.width": "12px"
  }
}
```

### 2. Make Scrollbars Wider
```json
"window.scrollbarWidth": "12px",
"terminal.integrated.scrollback": 10000
```

### 3. Add Scrollbar Arrows (Windows)
```json
"window.scrollbar.verticalScrollbarSize": 17,
"window.scrollbar.horizontalScrollbarSize": 17,
"window.scrollbar.arrowSize": 14
```

## For Terminal Specifically

### 1. Increase Terminal Scrollbar Size
```json
"terminal.integrated.scrollBarVisible": true,
"terminal.integrated.scrollback": 10000,
"terminal.integrated.scrollOnOutput": false,
"terminal.integrated.scrollOnUserInput": true
```

### 2. Use Custom CSS (Advanced)
1. Install the "Custom CSS and JS Loader" extension
2. Add this to your `settings.json`:
```json
"vscode_custom_css.imports": [
    "https://gist.githubusercontent.com/yourusername/yourgist/raw/.../scrollbar.css"
]
```

## Quick Wins
1. **Use Keyboard Shortcuts**
   - `Ctrl+Up`/`Ctrl+Down`: Scroll terminal
   - `Ctrl+Home`/`Ctrl+End`: Jump to top/bottom
   - `Alt+PageUp`/`Alt+PageDown`: Page up/down

2. **Try These Extensions**
   - "Custom CSS and JS Loader"
   - "Theme - Custom Scrollbar"

## Recommended Settings for Best Visibility

```json
{
  "workbench.colorCustomizations": {
    "scrollbarSlider.background": "#797979",
    "scrollbarSlider.hoverBackground": "#646464",
    "scrollbarSlider.activeBackground": "#bfbfbf",
    "scrollbarSlider.width": "14px"
  },
  "window.scrollbarWidth": "14px",
  "terminal.integrated.scrollBarVisible": true,
  "terminal.integrated.scrollback": 10000,
  "window.scrollbar.verticalScrollbarSize": 17
}
```

## For Windsurf-Specific Issues
If the above doesn't work in Windsurf, try:
1. Restarting Windsurf after changing settings
2. Checking for updates (newer versions may have improved scrollbars)
3. Reporting the issue in Windsurf's feedback channels
