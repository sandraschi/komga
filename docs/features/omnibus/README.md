# Omnibus Support in Komga

## Overview

Komga's Omnibus feature allows users to work with omnibus editions of books. An omnibus is a collection of multiple works (like novels, short stories, or manga volumes) published in a single volume. This feature enables Komga to recognize these collections and provide a better reading experience by treating each work within the omnibus as a separate entity.

## Features

- **Automatic Detection**: Komga can automatically detect omnibus editions based on metadata and table of contents.
- **Virtual Books**: Each work within an omnibus is treated as a separate virtual book.
- **Seamless Integration**: Virtual books appear alongside regular books in your library.
- **Metadata Support**: Each virtual book can have its own metadata, extracted from the omnibus or manually edited.
- **Reading Order**: Maintains the correct reading order of works within the omnibus.

## Supported Formats

- **EPUB**: Full support for EPUB omnibus editions with automatic detection and extraction of individual works.

## How It Works

1. **Detection**: When a book is added to Komga, the system checks if it's an omnibus edition.
2. **Extraction**: If an omnibus is detected, Komga extracts information about individual works from the table of contents.
3. **Virtual Books**: Creates virtual book entries for each work within the omnibus.
4. **Metadata**: Applies metadata to each virtual book, either from the omnibus metadata or through manual editing.
5. **Access**: Users can access and read each work individually while maintaining the context of the omnibus.

## Configuration

### Automatic Detection

Komga will automatically detect omnibus editions based on:
- File naming patterns (e.g., "Omnibus", "Collection" in the filename)
- Metadata tags
- Table of contents structure

### Manual Management

You can manually manage omnibus editions through the web interface or API:
- Convert a regular book to an omnibus
- Split an omnibus into individual works
- Edit metadata for individual works

## API Endpoints

The following API endpoints are available for managing omnibus editions:

- `GET /api/v1/omnibus/books/{bookId}` - Get virtual books for an omnibus
- `GET /api/v1/omnibus/virtual-books/{virtualBookId}` - Get a virtual book with omnibus information
- `POST /api/v1/omnibus/books/{bookId}/process` - Process an omnibus to extract virtual books
- `DELETE /api/v1/omnibus/books/{bookId}` - Delete all virtual books for an omnibus

## Examples

### Example: Processing an Omnibus

```http
POST /api/v1/omnibus/books/12345/process
```

### Example: Getting Virtual Books

```http
GET /api/v1/omnibus/books/12345
```

## Known Limitations

- Currently, only EPUB format is fully supported for omnibus detection and extraction.
- Some complex table of contents structures might require manual adjustment.
- Large omnibus files may take longer to process.

## Future Enhancements

- Support for more file formats (CBZ, PDF, etc.)
- Enhanced detection algorithms
- Batch processing for multiple omnibus editions
- More detailed progress reporting during processing

## Troubleshooting

If you encounter issues with omnibus detection or processing:

1. Check the server logs for any error messages.
2. Ensure the file is not corrupted.
3. Verify that the table of contents in the file is properly structured.
4. Try manually processing the omnibus through the web interface.

For additional help, please visit our [Discord server](https://discord.gg/TdRpkDu) or open an issue on GitHub.
