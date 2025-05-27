# Omnibus Feature - Developer Documentation

This document provides technical details about the Omnibus feature implementation in Komga.

## Architecture

The Omnibus feature is implemented across several components:

1. **OmnibusDetector**: Detects if a book is an omnibus edition.
2. **OmnibusProcessor**: Processes omnibus editions to extract individual works.
3. **VirtualBook**: Represents an individual work within an omnibus.
4. **VirtualBookService**: Manages virtual books and their lifecycle.
5. **OmnibusController**: Handles HTTP requests related to omnibus editions.

## Key Classes

### Domain Models

- `VirtualBook`: Represents a single work within an omnibus.
- `Work`: Represents a work within an omnibus (used during processing).
- `WorkType`: Enumerates different types of works (novel, short story, etc.).

### Services

- `OmnibusService`: Main service for omnibus-related operations.
- `VirtualBookService`: Manages virtual books.
- `EpubExtractionService`: Handles extraction of works from EPUB files.
- `OmnibusMetadataService`: Manages metadata for omnibus editions.

### Repositories

- `VirtualBookRepository`: Data access for virtual books.
- `JpaVirtualBookRepository`: JPA implementation of the repository.

### Controllers

- `OmnibusController`: REST endpoints for managing omnibus editions.
- `VirtualBookContentController`: Handles content delivery for virtual books.

## Data Flow

1. **Detection**:
   - `OmnibusDetector` checks if a book is an omnibus.
   - If detected, the book is processed by `OmnibusProcessor`.

2. **Processing**:
   - `EpubTocParser` extracts the table of contents.
   - Individual works are identified and created as `VirtualBook` instances.
   - Metadata is extracted and applied to each virtual book.

3. **Storage**:
   - Virtual books are stored in the database via `VirtualBookRepository`.
   - Original omnibus file is referenced by virtual books.

4. **Access**:
   - Users can access virtual books through the web interface or API.
   - `VirtualBookContentController` serves content for virtual books.

## API Documentation

### Endpoints

#### Get Virtual Books for an Omnibus

```http
GET /api/v1/omnibus/books/{bookId}
```

**Parameters:**
- `bookId`: ID of the omnibus book

**Response:**
```json
{
  "content": [
    {
      "id": "string",
      "title": "string",
      "number": 1,
      "createdDate": "2023-01-01T00:00:00Z"
    }
  ],
  "pageable": {
    "sort": {
      "sorted": false,
      "unsorted": true,
      "empty": true
    },
    "offset": 0,
    "pageNumber": 0,
    "pageSize": 20,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 1,
  "totalPages": 1,
  "last": true,
  "size": 20,
  "number": 0,
  "sort": {
    "sorted": false,
    "unsorted": true,
    "empty": true
  },
  "numberOfElements": 1,
  "first": true,
  "empty": false
}
```

#### Get Virtual Book with Omnibus Info

```http
GET /api/v1/omnibus/virtual-books/{virtualBookId}
```

**Parameters:**
- `virtualBookId`: ID of the virtual book

**Response:**
```json
{
  "virtualBook": {
    "id": "string",
    "title": "string",
    "number": 1,
    "createdDate": "2023-01-01T00:00:00Z"
  },
  "omnibus": {
    "id": "string",
    "title": "Omnibus Title",
    "url": "/api/v1/books/12345/file"
  }
}
```

#### Process Omnibus

```http
POST /api/v1/omnibus/books/{bookId}/process
```

**Parameters:**
- `bookId`: ID of the book to process as an omnibus

**Response:**
- 204 No Content on success

#### Delete Virtual Books for Omnibus

```http
DELETE /api/v1/omnibus/books/{bookId}
```

**Parameters:**
- `bookId`: ID of the omnibus book

**Response:**
- 204 No Content on success

## Database Schema

### Virtual Books Table

```sql
CREATE TABLE virtual_books (
  id VARCHAR(255) PRIMARY KEY,
  omnibus_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  sort_title VARCHAR(255) NOT NULL,
  number FLOAT,
  number_sort FLOAT,
  file_last_modified TIMESTAMP NOT NULL,
  file_size BIGINT NOT NULL,
  size BIGINT NOT NULL,
  url TEXT NOT NULL,
  file_last_modified_date TIMESTAMP NOT NULL,
  created_date TIMESTAMP NOT NULL,
  last_modified_date TIMESTAMP NOT NULL,
  metadata JSONB NOT NULL,
  media JSONB NOT NULL,
  FOREIGN KEY (omnibus_id) REFERENCES book(id) ON DELETE CASCADE
);

CREATE INDEX idx_virtual_book_omnibus_id ON virtual_books(omnibus_id);
CREATE INDEX idx_virtual_book_created_date ON virtual_books(created_date);
CREATE INDEX idx_virtual_book_last_modified_date ON virtual_books(last_modified_date);
```

## Testing

### Unit Tests

Unit tests are located in the `src/test` directory. Key test classes:

- `OmnibusDetectorTest`
- `OmnibusProcessorTest`
- `VirtualBookServiceTest`
- `OmnibusControllerTest`

### Integration Tests

Integration tests verify the interaction between components. Key test classes:

- `OmnibusIntegrationTest`
- `VirtualBookContentIntegrationTest`

## Future Work

- Add support for more file formats (CBZ, PDF, etc.)
- Improve detection algorithms
- Add batch processing for multiple omnibus editions
- Enhance metadata extraction
- Add support for custom work types
- Improve error handling and recovery
- Add more detailed logging and metrics

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
