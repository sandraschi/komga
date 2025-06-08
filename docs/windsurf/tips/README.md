# Windsurf Tips & Tricks

Boost your productivity with these Windsurf IDE tips and hidden features.

## Table of Contents

- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Terminal Mastery](#terminal-mastery)
- [LLM Integration](#llm-integration)
- [UI Customization](#ui-customization)
- [Advanced Features](#advanced-features)

## Keyboard Shortcuts

### Essential Shortcuts
- `Ctrl+Shift+P`: Command Palette
- `Ctrl+Shift+E`: Explorer
- `Ctrl+Shift+F`: Search in files
- `Ctrl+Shift+X`: Extensions
- `Ctrl+Shift+``: Toggle terminal

### Navigation
- `Ctrl+P`: Quick open files
- `Ctrl+Shift+O`: Go to symbol
- `Ctrl+G`: Go to line
- `Ctrl+Tab`: Switch between open editors

### Editor
- `Alt+Up/Down`: Move line up/down
- `Shift+Alt+Up/Down`: Copy line up/down
- `Ctrl+/`: Toggle line comment
- `Shift+Alt+F`: Format document

## Terminal Mastery

### Turbo Mode
Enable for faster command execution:
1. Open settings (`Ctrl+,`)
2. Search for "Turbo Mode"
3. Toggle to enable

### Custom Commands
Add to `settings.json`:
```json
{
  "terminal.integrated.commandsToSkipShell": [
    "workbench.action.terminal.copySelection",
    "workbench.action.terminal.paste"
  ]
}
```

## LLM Integration

### Prompt Engineering
- Be specific with your requests
- Use markdown for code blocks
- Break complex tasks into smaller steps
- Use `@` to reference files or code

### Context Management
- Use `@` to add context from open files
- Reference specific functions with `functionName()`
- Add error messages directly in your prompt

## UI Customization

### Custom Themes
1. Install theme extension
2. `Ctrl+Shift+P` → "Preferences: Color Theme"
3. Select your theme

### Custom Icons
1. Install "Material Icon Theme"
2. `Ctrl+Shift+P` → "File Icon Theme"
3. Select "Material Icon Theme"

## Advanced Features

### Multi-cursor Editing
- `Alt+Click`: Add cursor
- `Ctrl+Alt+Up/Down`: Add cursor above/below
- `Shift+Alt+I`: Add cursor to end of each selected line

### Snippets
Create custom snippets:
1. `Ctrl+Shift+P` → "Preferences: Configure User Snippets"
2. Select language
3. Add your snippet:
```json
{
  "For Loop": {
    "prefix": "for",
    "body": [
      "for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {",
      "\t${3:// code}",
      "}"
    ],
    "description": "For loop"
  }
}
```

### Integrated Terminal
- `Ctrl+\``: Toggle terminal
- `Ctrl+Shift+5`: Split terminal
- `Ctrl+Shift+[1-9]`: Switch terminal

## Productivity Boosters

### Command Palette
- `Ctrl+Shift+P` then type:
  - `>Tasks: Run Task`
  - `>Git: Clone`
  - `>Debug: Start Debugging`

### Zen Mode
- `Ctrl+K Z`: Toggle Zen mode
- `Esc Esc`: Exit Zen mode

### Auto Save
Enable in settings:
```json
{
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000
}
```

## Hidden Gems

### Emmet in HTML
Type `!` then `Tab` for HTML5 boilerplate

### Multi-cursor Rename
1. Select variable
2. `F2` to rename all occurrences

### Column Selection
- `Shift+Alt+Mouse drag`
- Or `Shift+Alt+Arrow keys`

## Performance Tips

### Disable Animations
Add to `settings.json`:
```json
{
  "workbench.settings.enableNaturalLanguageSearch": false,
  "workbench.list.smoothScrolling": false,
  "editor.smoothScrolling": false
}
```

### Memory Management
- Close unused editors
- Disable unused extensions
- Increase memory limit in `windsurf-args.txt`:
```
--max-old-space-size=8192