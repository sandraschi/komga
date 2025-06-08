# Meta Book User Guide

## Overview
The Meta Book feature allows users to generate AI-powered analyses of books in their Komga library. These analyses can include summaries, character breakdowns, thematic analysis, and more, depending on the selected options.

## Enabling the Feature

The Meta Book feature is enabled by default. To disable it, add the following to your `application.yml`:

```yaml
meta-book:
  enabled: false
```

## Configuration

### LLM Configuration

To use the Meta Book feature, you need to configure an LLM provider. Currently, only OpenAI is supported.

```yaml
komga:
  llm:
    openai:
      api-key: ${OPENAI_API_KEY}  # Your OpenAI API key
      model: gpt-4                # Model to use (default: gpt-4)
      api-url: https://api.openai.com  # API URL (default: https://api.openai.com)
```

### Storage Configuration

Meta books are stored in the following directory by default:

```yaml
komga:
  storage:
    meta-books-dir: ${KOMGA_META_BOOKS_DIR:${KOMGA_CONFIG_DIRECTORY:data/meta-books}}
```

### Default Generation Options

You can configure default generation options:

```yaml
komga:
  meta-book:
    default-options:
      depth: STANDARD  # STANDARD, DEEP, or BRIEF
      include-spoilers: false
      sections:  # Which sections to include
        - SUMMARY
        - CHARACTERS
        - THEMES
        - STYLE
      language: en  # Language for the analysis
      style: ANALYTICAL  # ANALYTICAL, CASUAL, or FORMAL
```

## Using the API

### Generate a Meta Book

```http
POST /api/v1/meta/books
Content-Type: application/json

{
  "bookIds": ["book1", "book2"],
  "options": {
    "format": "EPUB",  // EPUB, PDF, MARKDOWN, or WEB
    "depth": "DEEP",
    "includeSpoilers": false,
    "sections": ["SUMMARY", "CHARACTERS"],
    "language": "en",
    "style": "ANALYTICAL"
  }
}
```

### Get Meta Book Status

```http
GET /api/v1/meta/books/{id}
```

### Download Generated Meta Book

```http
GET /api/v1/meta/books/{id}/download
```

### List All Meta Books

```http
GET /api/v1/meta/books?page=0&size=20
```

### Delete a Meta Book

```http
DELETE /api/v1/meta/books/{id}
```

## Error Handling

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Meta book not found
- `500 Internal Server Error`: Server error during processing

## Troubleshooting

1. **API Key Issues**: Ensure your OpenAI API key is valid and has sufficient credits.
2. **Storage Permissions**: The Komga process needs write access to the meta-books directory.
3. **Rate Limiting**: If you encounter rate limits, consider upgrading your OpenAI plan or reducing request frequency.
4. **Large Books**: Processing very large books may time out. Consider splitting them into smaller sections.

## Security Considerations

- API keys are stored in memory and never logged.
- Generated content is stored on the server and accessible only to the user who created it.
- Consider enabling authentication to prevent unauthorized access to generated content.
