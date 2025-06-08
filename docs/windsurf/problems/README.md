# Known Issues in Windsurf IDE

This document outlines common problems users may encounter while using Windsurf IDE, along with their status and workarounds.

## Table of Contents

- [UI/UX Issues](#uiux-issues)
- [Performance Problems](#performance-problems)
- [Hidden Rate Limiting](#hidden-rate-limiting)
- [Terminal Issues](#terminal-issues)
- [LLM Integration](#llm-integration)
- [Other Issues](#other-issues)

## UI/UX Issues

### 1. Scrollbar Visibility
- **Description**: Scrollbars in dark theme are difficult to see
- **Affected Areas**: Editor, Terminal, Cascade panel
- **Status**: Reported, no fix yet
- **Workarounds**:
  - Use keyboard shortcuts (Ctrl+Up/Down, Page Up/Down)
  - Try different themes
  - Adjust system display scaling

### 2. Terminal Hangs
- **Description**: Terminal sometimes becomes unresponsive
- **Status**: Under investigation
- **Workarounds**:
  - Use Turbo Mode for common commands
  - Close unused terminal instances
  - Restart Windsurf if persistent

## Performance Problems

### 1. High Memory Usage
- **Description**: Windsurf consumes significant system resources
- **Status**: Known issue, optimizations in progress
- **Workarounds**:
  - Close unused editors and panels
  - Disable unused extensions
  - Increase system RAM if possible

## Hidden Rate Limiting

### 1. Cascade Command Limits
- **Description**: Unclear rate limiting on Cascade commands
- **Status**: Confirmed by users
- **Workarounds**:
  - Space out complex operations
  - Use simpler prompts
  - Check Windsurf status page for service issues

## Terminal Issues

### 1. Command Execution Delays
- **Description**: Commands take time to execute without feedback
- **Status**: Reported
- **Workarounds**:
  - Use Turbo Mode for trusted commands
  - Check for background processes

## LLM Integration

### 1. Context Window Limitations
- **Description**: Limited context window size for LLM operations
- **Status**: Technical limitation
- **Workarounds**:
  - Break down complex tasks
  - Use more specific prompts

## Other Issues

### 1. Extension Compatibility
- **Description**: Some VS Code extensions may not work as expected
- **Status**: Ongoing compatibility improvements
- **Workarounds**:
  - Check extension compatibility
  - Report issues to extension maintainers

## Reporting Issues

When reporting new issues, please include:
1. Windsurf version
2. Operating system and version
3. Steps to reproduce
4. Expected vs actual behavior
5. Any error messages