# Calibre Optimization - Developer Documentation

## Architecture Overview

The Calibre optimization system provides a bridge between Calibre's library management and Komga's reading platform. It's designed to be modular, allowing for different optimization strategies and formats.

### Core Components

1. **Calibre Interface**
   - Communicates with Calibre's database and content server
   - Handles book metadata and file access
   - Manages conversion jobs

2. **Format Converters**
   - EPUB optimization
   - CBZ creation from various sources
   - PDF extraction and conversion
   - Custom format handlers

3. **Metadata Processor**
   - Maps between Calibre and Komga metadata schemas
   - Handles special fields and custom columns
   - Manages author and series information

4. **File System Manager**
   - Handles file operations
   - Manages temporary files
   - Implements the target directory structure

## Implementation Details

### Data Models

```kotlin
// Calibre book representation
data class CalibreBook(
    val id: Long,
    val title: String,
    val authors: List<Author>,
    val formats: Map<String, Path>,
    val metadata: Map<String, Any>,
    val customColumns: Map<String, Any>
)

// Conversion options
data class ConversionOptions(
    val targetFormat: String,
    val outputStructure: OutputStructure,
    val metadataOptions: MetadataOptions,
    val imageOptions: ImageOptions,
    val cleanupOptions: CleanupOptions
)

// Conversion result
data class ConversionResult(
    val originalBook: CalibreBook,
    val outputFiles: List<Path>,
    val metadata: Map<String, Any>,
    val duration: Duration,
    val success: Boolean,
    val error: Throwable? = null
)
```

### API Endpoints

#### Start Conversion Job

```http
POST /api/v1/calibre/convert
Content-Type: application/json

{
  "bookIds": [123, 456, 789],
  "options": {
    "targetFormat": "epub",
    "outputStructure": "hierarchical",
    "metadata": {
      "includeOriginal": true,
      "enhanceWithKomga": true
    },
    "images": {
      "maxWidth": 1200,
      "quality": 85,
      "convertToJpeg": true
    }
  },
  "callbackUrl": "https://your-server.com/callbacks/calibre"
}
```

#### Get Job Status

```http
GET /api/v1/calibre/jobs/{jobId}
```

#### Cancel Job

```http
DELETE /api/v1/calibre/jobs/{jobId}
```

### Configuration

```yaml
calibre:
  enabled: true
  libraryPath: "/path/to/calibre/library"
  databaseUrl: "jdbc:sqlite:/path/to/calibre/metadata.db"
  tempDir: "/tmp/komga-calibre"
  
  conversion:
    defaultFormat: "epub"
    defaultQuality: 85
    maxConcurrent: 2
    timeout: 1h
    
    formats:
      epub:
        version: "3.0"
        removeDrm: false
        splitOnPageBreaks: true
        insertMetadata: true
        
      cbz:
        imageFormat: "jpg"
        quality: 90
        stripMetadata: true
        
  metadata:
    fieldMappings:
      title: "title"
      authors: "authors.name"
      series: "series.name"
      seriesIndex: "series.position"
      tags: "tags.name"
      comments: "summary"
      published: "release_date"
    
    defaultValues:
      publisher: "Unknown"
      language: "en"
```

## Integration Points

### Calibre Database Access

```kotlin
interface CalibreDatabase {
    fun connect(config: DatabaseConfig): Connection
    fun getBook(bookId: Long): CalibreBook?
    fun searchBooks(query: String): List<CalibreBook>
    fun getBookFormats(bookId: Long): Map<String, Path>
    fun getCustomColumns(): Map<String, CustomColumn>
}
```

### Format Conversion

```kotlin
interface FormatConverter {
    val supportedFormats: Set<String>
    
    fun convert(
        source: Path,
        target: Path,
        options: Map<String, Any> = emptyMap()
    ): ConversionResult
    
    fun validate(source: Path): Boolean
}
```

### Metadata Processing

```kotlin
interface MetadataProcessor {
    fun process(
        book: CalibreBook,
        options: MetadataOptions
    ): Map<String, Any>
    
    fun mapField(calibreField: String, komgaField: String)
    fun addCustomField(name: String, type: FieldType, processor: (CalibreBook) -> Any?)
}
```

## Performance Considerations

1. **Database Access**
   - Use connection pooling
   - Implement query batching
   - Cache frequently accessed data

2. **File Operations**
   - Use efficient file copying
   - Implement proper cleanup of temporary files
   - Consider filesystem-specific optimizations

3. **Memory Management**
   - Process large files in chunks
   - Limit concurrent operations
   - Monitor memory usage

## Testing

### Unit Tests

- Test individual components in isolation
- Mock external dependencies
- Test edge cases and error conditions

### Integration Tests

- Test with a sample Calibre library
- Verify file format conversions
- Test metadata extraction and mapping

## Security Considerations

1. **File System Access**
   - Validate all file paths
   - Implement proper file permissions
   - Sanitize user input

2. **Data Privacy**
   - Handle sensitive data appropriately
   - Implement proper cleanup of temporary files
   - Log minimal necessary information

3. **External Tools**
   - Validate all external tool output
   - Implement timeouts for long-running operations
   - Handle tool failures gracefully

## Future Enhancements

- Support for more input and output formats
- Two-way metadata synchronization
- Advanced duplicate detection
- Automated library maintenance
- Plugin system for custom formats and processors

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for general guidelines. For Calibre-specific contributions:

1. Document any new dependencies
2. Include tests for new format support
3. Update documentation for any new features
4. Consider backward compatibility with existing libraries
