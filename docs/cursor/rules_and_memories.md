# Cursor Rules, Rulebooks, and Memories: A Guide

## What Are Rules, Rulebooks, and Memories in Cursor?

**Rules** are explicit instructions that guide the AI's behavior in your workspace. They can be about coding style, technology choices, security, or anything else you want the AI to always respect.

**Rulebooks** are collections of rules, often grouped by topic (e.g., "Windows Scripting", "Security", "Documentation"). They help organize and apply rules consistently across projects or systemwide.

**Memories** are persistent facts, preferences, or context the AI remembers about your workspace, project, or workflow. They can be technical ("Use SQLite for local storage"), stylistic ("Always use snake_case"), or process-related ("Never touch the main app code").

---

## How to Create, Update, and Use Rules and Memories

### Creating a Rule
- Tell the AI: "Please always..." or "Make a rule that..."
- Example: "Please only use Windows batch or PowerShell syntax, never Unix/Linux commands."
- The AI will confirm and store the rule as a memory.

### Creating a Memory
- Tell the AI to remember a fact or preference.
- Example: "Remember that the backend runs on port 3001."

### Updating or Deleting
- You can ask the AI to update or delete a rule or memory if your needs change.

### Using Rulebooks
- Rulebooks can be created for different domains (e.g., "Windows-only scripting").
- You can ask the AI to apply a rulebook to a project or workspace.

---

## Making Rules Systemwide and Nonvolatile

- **Systemwide rules** apply to all projects and sessions in Cursor.
- **Nonvolatile rules** persist even after restarts or updates.
- To make a rule systemwide, say: "Make this a systemwide rule."
- To make it nonvolatile, say: "Make this rule nonvolatile."
- The AI will confirm and store the rule in a way that applies everywhere.

---

## Best Practices
- Be explicit and unambiguous in your rules.
- Group related rules into rulebooks for easier management.
- Review and update your rules and memories as your workflow evolves.
- Use rules to enforce security, style, and technology choices.

---

## Example: Windows-only Scripting Rule

> "Please only use Windows Command Prompt (cmd.exe) or PowerShell syntax and commands. Do not use Unix/Linux-only commands, options, or utilities (such as tee, cat, grep, or piping to tee). All scripts must be compatible with standard Windows environments."

- This rule ensures all generated scripts work natively on Windows.
- The AI will remember and apply this rule to all future scripting tasks.

---

## Where Are Rules and Memories Stored?
- In Cursor, rules and memories are managed by the AI and are not always visible as files, but you can ask the AI to list or summarize them.
- For documentation, you can keep a summary in your `docs/cursor/` folder as a reference for your team.

---

## Further Reading
- See the Cursor documentation for more on advanced rulebook management and automation. 