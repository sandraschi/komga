# Guide: Using Cursor with Local LLMs, Rulebooks, and Advanced Linting

## 1. Linting All Kotlin Files Efficiently

### 1.1. Linting with Gradle/Ktlint
- **Command:**
  ```sh
  ./gradlew ktlintCheck
  ```
  or for Windows:
  ```sh
  gradlew.bat ktlintCheck
  ```
- **What it does:** Runs ktlint on all Kotlin files in the project, reporting all style and syntax errors in one go.
- **Fixing Automatically:**
  ```sh
  ./gradlew ktlintFormat
  ```
- **Avoiding Multiple Failed Builds:**
  - Always run `ktlintCheck` before a full build to catch all errors at once.
  - Use an IDE with Kotlin support (IntelliJ, Cursor, VSCode) for real-time syntax highlighting.
  - Fix all reported errors before running the full build.

### 1.2. Checking for Multiple Errors
- `ktlintCheck` will list all syntax/style errors across all files, not just the first one.
- Review the output or the generated report (often in `build/reports/ktlint/`).

---

## 2. Configuring Cursor for Local LLMs (Ollama, LM Studio)

### 2.1. Ollama
- **Start Ollama:** Ensure `ollama` is running (`ollama serve` or via the app).
- **Cursor Config Example:**
  ```json
  {
    "llm": {
      "provider": "ollama",
      "api_url": "http://localhost:11434",
      "model": "llama3:70b-instruct-q4_K_M"
    }
  }
  ```
- **How to Set:** In Cursor, go to LLM settings or edit the config file (location varies by OS and install method).

### 2.2. LM Studio
- **Start LM Studio:** Launch LM Studio and start the local server (usually at `http://localhost:1234/v1`).
- **Cursor Config Example:**
  ```json
  {
    "llm": {
      "provider": "openai-compatible",
      "api_url": "http://localhost:1234/v1",
      "model": "mistral-7b-instruct-v0.2-Q5_K_M"
    }
  }
  ```
- **How to Set:** As above, use the LLM settings or config file.

### 2.3. Checking the Active LLM
- In Cursor, the active LLM is usually shown in the status bar or LLM settings panel.
- You can also check the config file for the current provider and model.

---

## 3. Best FOSS LLMs for Local Use (High-End PC)

| Model Name                | Provider   | Strengths                | RAM/VRAM Needs | Notes                        |
|--------------------------|------------|--------------------------|----------------|------------------------------|
| Llama 3 (70B, 8B, 13B)   | Ollama     | General, code, chat      | 32GB+ VRAM for 70B | Best overall, 8B/13B for less RAM |
| Mistral 7B/8x22B         | Ollama/LM  | Code, chat, reasoning    | 16-32GB+        | Fast, strong for code        |
| CodeLlama 34B            | LM Studio  | Coding                   | 48GB+          | Best for code, large         |
| Deepseek Coder 33B       | LM Studio  | Coding                   | 48GB+          | Top open-source code model   |
| WizardCoder 34B          | LM Studio  | Coding                   | 48GB+          | Good for code, chat          |
| Phi-3 (Mini/Medium)      | Ollama/LM  | Reasoning, chat          | 8-16GB         | Efficient, good for chat     |

- **For your 4090 (24GB VRAM):** Llama 3 70B (quantized), Deepseek Coder 33B, CodeLlama 34B, Mistral 8x22B are all viable.
- **For code:** Deepseek Coder 33B, CodeLlama 34B, Llama 3 70B (if quantized), WizardCoder 34B.
- **For general chat:** Llama 3 70B, Mistral 8x22B, Phi-3 Medium.

---

## 4. Setting Up a Rulebook in Cursor

### 4.1. What is a Rulebook?
- A set of persistent instructions or guidelines for the LLM/agent to follow (e.g., coding style, language, formatting, behavior).

### 4.2. How to Set Up
- **Prompt Engineering:**
  - Use the "system prompt" or "custom instructions" feature in Cursor's LLM settings.
  - Example:
    > "You are an expert Kotlin developer. Always use idiomatic Kotlin, follow Ktlint rules, and explain your reasoning."
- **Persistent Instructions:**
  - Some versions of Cursor allow you to save these as defaults for all sessions.
  - For advanced use, create a markdown or text file with your rulebook and reference it in your prompts.

### 4.3. Best Practices
- Be explicit and concise.
- Cover style, formatting, and behavioral expectations.
- Update as your needs evolve.

---

## 5. Extended Memory and Context Tools in Cursor (with mcp)

### 5.1. Context Window
- **Depends on LLM:**
  - Local LLMs: 4k-128k tokens (model-dependent)
  - Cloud LLMs: Up to 128k tokens (GPT-4o, Claude 3 Opus)
- **Maximizing Context:**
  - Use models with large context windows (e.g., Llama 3 70B, Mistral 8x22B, Claude 3 Opus)
  - Use Cursor's "extended memory" or "project memory" features if available
  - Use mcp tools for semantic search and codebase chunking

### 5.2. mcp Tools for Memory
- **Semantic Search:** Finds relevant code/docs for your queries
- **File Summarization:** Summarizes large files for context
- **Agentic Memory:** Some workflows cache previous steps/results

---

## 6. mcp Tools Used by Cursor

| Tool Name         | Purpose/Capability                                 |
|-------------------|----------------------------------------------------|
| codebase_search   | Semantic code search across the project            |
| grep_search       | Fast regex search                                  |
| read_file         | Read file contents (with context window limits)    |
| edit_file         | Edit files (insert, replace, delete)               |
| file_search       | Fuzzy file search                                  |
| list_dir          | List directory contents                            |
| run_terminal_cmd  | Run shell/terminal commands                        |
| delete_file       | Delete files                                       |
| reapply           | Retry last edit if it failed                       |
| create_diagram    | Generate Mermaid diagrams                          |
| mcp_*_github_*    | GitHub integration (issues, PRs, branches, etc.)   |
| mcp_*_outlook_*   | Outlook integration (email, calendar, contacts)    |
| mcp_*_notion_*    | Notion integration (pages, databases, comments)    |
| mcp_*_one_drive_* | OneDrive integration (files, folders)              |
| mcp_*_tavily_*    | Web search, news, images, events                   |

- **Note:** The exact set of tools may vary by Cursor version and enabled plugins.
- **Agentic workflows** in Cursor use these tools to automate complex tasks (search, edit, refactor, run tests, etc.).

---

## 7. References and Further Reading
- [Cursor vs. Windsurf Detailed Analysis](./cursor_vs_windsurf_detailed_analysis.md)
- [Ollama (Local LLMs)](https://ollama.com/)
- [LM Studio](https://lmstudio.ai/)
- [Deepseek Coder](https://github.com/deepseek-ai/DeepSeek-Coder)
- [Llama 3](https://llama.meta.com/llama3)
- [Ktlint](https://pinterest.github.io/ktlint/)

---

*This guide is maintained as part of the Komga AI Extensions documentation. For updates, see the AI Extensions README and related sections.* 