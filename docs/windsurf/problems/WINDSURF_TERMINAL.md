# Windsurf Terminal Management Guide

This guide covers how to optimize and troubleshoot terminal usage in Windsurf, with a focus on preventing hangs and improving workflow efficiency.

## Turbo Mode

### What is Turbo Mode?
Turbo Mode allows Cascade to execute terminal commands automatically without requiring manual approval for each command.

### Key Benefits
- **Faster Execution**: No waiting for approval on each command
- **Reduced UI Blocking**: Minimizes terminal hangs
- **Streamlined Workflow**: Ideal for repetitive, safe commands

### How to Enable
1. Click the gear icon (bottom-left)
2. Select "Settings"
3. Search for "Turbo Mode"
4. Toggle the switch

## Allow and Deny Lists

### Allow List
Commands that can always run without approval.

**Setup:**
1. `Ctrl+Shift+P` → "Open Settings (UI)"
2. Find `windsurf.cascadeCommandsAllowList`
3. Add commands (e.g., `git`, `gradlew`, `npm`)

### Deny List
Prevents commands from running automatically.

**Setup:**
1. `Ctrl+Shift+P` → "Open Settings (UI)"
2. Find `windsurf.cascadeCommandsDenyList`
3. Add risky commands (e.g., `rm -rf`)

## Preventing Terminal Hangs

### Quick Fixes
1. **Enable Turbo Mode** for development
2. **Allow common commands** like `git` and `gradlew`
3. **Close unused terminals**
4. **Use `--stop`** before Gradle commands:
   ```bash
   ./gradlew --stop
   ./gradlew clean build
   ```

### Example Configuration

**Allow List:**
```json
"windsurf.cascadeCommandsAllowList": [
    "git",
    "gradlew",
    "./gradlew",
    "npm",
    "mvn"
]
```

**Deny List:**
```json
"windsurf.cascadeCommandsDenyList": [
    "rm -rf",
    "format",
    "shutdown"
]
```

## Troubleshooting

### If Terminal Hangs:
1. Close the terminal tab
2. `Ctrl+Shift+P` → "Terminal: Kill Active Terminal"
3. Check Task Manager for stuck processes
4. Restart Windsurf if needed

### If Commands Don't Run:
1. Check Turbo Mode status
2. Verify command isn't in Deny list
3. Try with `--info` for more details
