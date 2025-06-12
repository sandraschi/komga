# Contributing to Docs Viewer

Thank you for considering contributing to Docs Viewer! To ensure a robust, user-friendly, and maintainable codebase, all new code must follow these error handling and robustness standards:

## 1. Error Handling Standards

- **All synchronous file and directory access (e.g., `fs.readdirSync`, `fs.statSync`, `fs.readFileSync`, etc.) must be wrapped in `try/catch`.**
- **All async/await code and API endpoints must be wrapped in `try/catch`, and errors must be logged and returned as clear JSON error messages.**
- **Every new Express route must have error handling, and the global error handler must remain in place.**
- **All new modules must not allow unhandled promise rejections or uncaught exceptions—these must be logged and the process should exit.**
- **Frontend code should use error boundaries and always display user-friendly error messages for failed API calls.**

## 2. Backend API Endpoint Template

```
javascript
app.get('/api/new-feature', async (req, res) => {
  try {
    // ... your logic ...
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[API] /api/new-feature error: ${err.message}`);
    res.status(500).json({ error: 'Failed to process request: ' + err.message });
  }
});
```

## 3. Synchronous File Access Template

```
javascript
let data;
try {
  data = fs.readFileSync(filePath, 'utf8');
} catch (e) {
  logger.error(`[FS] Failed to read file: ${filePath} - ${e.message}`);
  // handle error or return a clear error to the user
}
```

## 4. React Error Boundary Template (Frontend)

```
javascript
class MyComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Log error to console or backend
    console.error('Component error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red' }}>An error occurred: {this.state.error?.message || String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}
```

## 5. Code Review Checklist

- [ ] All file and network operations are wrapped in try/catch.
- [ ] All errors are logged and user feedback is provided.
- [ ] No unhandled promise rejections or exceptions.
- [ ] Global error handlers are present and active.
- [ ] Frontend uses error boundaries and displays user-friendly error messages.

## 6. Automated Linting/Testing (Recommended)

- Use ESLint rules or custom scripts to flag missing try/catch or error handling in new code.
- Add integration tests that simulate errors and verify that the system responds with clear error messages and does not hang.

---

By following these standards, you help ensure Docs Viewer is stable, reliable, and easy to maintain. Thank you for your contributions! 