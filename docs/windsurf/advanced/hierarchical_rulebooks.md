# Hierarchical and Context-Aware Rulebooks

This document outlines strategies for organizing and managing rulebooks in Windsurf, focusing on practical implementation of hierarchical rules and context-aware activation.

## Table of Contents
- [Rulebook Organization](#rulebook-organization)
- [Context Detection](#context-detection)
- [Rule Inheritance](#rule-inheritance)
- [Activation Strategies](#activation-strategies)
- [Performance Considerations](#performance-considerations)
- [Example Implementations](#example-implementations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Rulebook Organization

### Directory Structure
```
.windsurf/
├── rulebooks/
│   ├── base/                  # Core rules always active
│   │   ├── security/
│   │   ├── version_control/
│   │   └── base.rules.yml
│   │
│   ├── languages/
│   │   ├── javascript/
│   │   ├── python/
│   │   └── shell/
│   │
│   ├── frameworks/
│   │   ├── react/
│   │   ├── vue/
│   │   └── node/
│   │
│   ├── projects/
│   │   ├── project-a/
│   │   └── project-b/
│   │
│   └── environments/
│       ├── development/
│       ├── testing/
│       └── production/
│
└── config.yml              # Main configuration
```

### Configuration File Example
```yaml
# .windsurf/config.yml
rulebooks:
  # Always load these rulebooks
  always_load:
    - base/security
    - base/version_control
    
  # Load based on project type
  auto_detect:
    - conditions:
        - "file_exists:package.json"
      load:
        - languages/javascript
        - frameworks/node
        
      # Nested conditions
      conditions:
        - "file_exists:next.config.js"
        load:
          - frameworks/nextjs
          
    - conditions:
        - "file_exists:requirements.txt"
      load:
        - languages/python
        
  # Environment-specific rules
  environments:
    development:
      load: environments/development
    production:
      load: environments/production
      
  # Manual overrides (takes precedence)
  force_load: []
  disable: []
```

## Context Detection

### Detection Strategies

1. **File-based Detection**
   ```yaml
   # Example: Detect Python project
   - name: "Detect Python Project"
     conditions:
       - "file_exists:requirements.txt"
       - or:
         - "file_exists:setup.py"
         - "file_exists:pyproject.toml"
     actions:
       - set_context: "python_project"
       - load_rulebook: "languages/python"
   ```

2. **Toolchain Detection**
   ```yaml
   # Detect Node.js version
   - name: "Check Node.js Version"
     conditions:
       - "command_succeeds:node --version"
     actions:
       - run: "node --version"
         set_output: "node_version"
       - if: "${output.node_version} >= 'v18.0.0'"
         then:
           - set_context: "node_modern"
   ```

3. **Project Structure Analysis**
   ```yaml
   # Analyze project structure
   - name: "Analyze Project Structure"
     actions:
       - analyze_project:
           patterns:
             "*.py": "python_file"
             "*.js": "javascript_file"
             "Dockerfile": "docker_project"
           set_context: true
   ```

## Rule Inheritance

### Base Rules
```yaml
# base/security.rules.yml
rules:
  - name: "Block unsafe shell patterns"
    description: "Prevent execution of potentially dangerous shell patterns"
    pattern: "rm -rf / || :"
    severity: "error"
    message: "Dangerous shell pattern detected"
```

### Language-Specific Rules
```yaml
# languages/python/security.rules.yml
inherits: "base/security"

rules:
  - name: "Python: Check for unsafe deserialization"
    pattern: "import (pickle|cPickle)"
    severity: "warning"
    message: "Consider using safer alternatives to pickle for deserialization"
```

## Activation Strategies

### Lazy Loading
```yaml
# Example: Load rules when a specific file is opened
- name: "Load TypeScript rules on file open"
  triggers:
    - on_file_open: "*.ts"
  conditions:
    - "not:context:typescript_loaded"
  actions:
    - load_rulebook: "languages/typescript"
    - set_context: "typescript_loaded"
```

### Dynamic Rule Activation
```yaml
# Dynamically enable/disable rules based on context
- name: "Toggle debug rules"
  triggers:
    - on_command: "toggle_debug"
  actions:
    - if: "${context:debug_mode}"
      then:
        - disable_rulebook: "debug/*"
        - unset_context: "debug_mode"
      else:
        - enable_rulebook: "debug/*"
        - set_context: "debug_mode"
```

## Performance Considerations

### Rule Loading Optimization
1. **Lazy Loading**
   ```yaml
   # Load rules only when needed
   - name: "Load shell rules on first shell file"
     triggers:
       - on_file_open: "*.sh"
     conditions:
       - "not:context:shell_rules_loaded"
     actions:
       - load_rulebook: "languages/shell"
       - set_context: "shell_rules_loaded"
   ```

2. **Rule Compilation**
   ```yaml
   # Pre-compile frequently used patterns
   patterns:
     sensitive_data: "(?i)(password|secret|token|api[_-]?key)"
     
   rules:
     - name: "Detect potential secrets"
       pattern: "${patterns.sensitive_data}"
   ```

3. **Caching**
   ```yaml
   # Cache expensive operations
   - name: "Check dependencies"
     actions:
       - cache_key: "${file_mtime:package.json}"
       - if: "!cache_hit"
         then:
           - run: "npm ls --json"
             set_output: "dependencies"
             cache: "1h"
   ```

## Example Implementations

### Shell Project
```yaml
# .windsurf/rulebooks/projects/shell-tools/config.yml
conditions:
  - "file_exists:*.sh"
  - "file_exists:Makefile"

load:
  - base/security
  - languages/shell
  - environments/development

rules:
  - name: "ShellCheck all scripts"
    triggers:
      - on_file_save: "*.sh"
    actions:
      - run: "shellcheck ${file}"
```

### Node.js Project
```yaml
# .windsurf/rulebooks/projects/node-app/config.yml
conditions:
  - "file_exists:package.json"

load:
  - base/security
  - languages/javascript
  - frameworks/node
  - if: "file_exists:next.config.js"
    load: frameworks/nextjs

rules:
  - name: "Run tests on change"
    triggers:
      - on_file_save: "src/**/*.{js,jsx,ts,tsx}"
    actions:
      - run: "npm test -- --watchAll=false"
        async: true
```

## Best Practices

1. **Start Simple**
   - Begin with essential rules
   - Add complexity gradually
   - Document each rule's purpose

2. **Use Meaningful Names**
   ```yaml
   # Bad
   rule1:
     # ...
     
   # Good
   prevent_console_log_in_production:
     # ...
   ```

3. **Test Thoroughly**
   - Create test cases for rules
   - Test in isolation
   - Monitor performance impact

4. **Document Dependencies**
   ```yaml
   # .windsurf/rulebooks/languages/python/README.md
   ## Python Rules
   
   ### Dependencies
   - Python 3.8+
   - pylint
   - mypy
   
   ### Activation
   Rules are automatically activated when `requirements.txt` or `setup.py` is detected.
   ```

## Troubleshooting

### Common Issues

1. **Rules Not Loading**
   - Check `windsurf.log` for errors
   - Verify file permissions
   - Check condition logic

2. **Performance Problems**
   - Use `windsurf --profile` to identify slow rules
   - Check for redundant patterns
   - Implement caching

3. **Rule Conflicts**
   - Use `windsurf rule list --conflicts`
   - Check rule priorities
   - Review inheritance chains

### Debugging Tools
```bash
# List all active rules
windsurf rule list

# Test rule matching
windsurf rule test path/to/file

# Profile rule execution
windsurf --profile command
```

## Conclusion

Implementing hierarchical, context-aware rulebooks in Windsurf allows for powerful yet efficient automation. By carefully organizing rules and leveraging the activation strategies outlined in this document, you can create a responsive and maintainable rule system that adapts to your project's needs.

Remember to:
1. Start with a clear organization structure
2. Use conditions effectively
3. Monitor performance
4. Document thoroughly
5. Test across different scenarios
