# Calibre Integration Analysis & Implementation Plan

## 1. Current Limitations in Komga

### 1.1 Metadata.opf File Parsing
Komga currently lacks support for Calibre's `metadata.opf` files, which contain extensive metadata including:
- Title, subtitles, and alternative titles
- Multiple authors with roles
- Series information and reading order
- ISBN, ASIN, and other identifiers
- Detailed descriptions and comments
- Hierarchical tags and categories
- Publisher and imprint information
- Publication and modification dates
- Language and translation metadata
- Custom metadata fields and user-defined columns
- Reading progress and bookmarks

### 1.2 PDF Handling Limitations
Current PDF processing in Komga has several shortcomings:
- Limited metadata extraction from PDF headers
- Inconsistent title and author extraction
- No utilization of XMP metadata
- Poor handling of PDFs in series
- Missing support for PDF bookmarks and TOC
- Inefficient cover image extraction

### 1.3 Directory Structure Mismatch
Calibre's directory structure:
```
Library/
  Author Name/
    Book Title (Series #)/
      Book Title - Author - Series #.pdf
      metadata.opf
      cover.jpg
      other_files/
```

Current issues:
- Inefficient file scanning
- Loss of metadata relationships
- Poor series recognition
- Inconsistent file organization

## 2. Technical Analysis

### 2.1 Metadata.opf Structure
```xml
<?xml version='1.0' encoding='utf-8'?>
<package unique-identifier="uuid_id" version="3.0">
  <metadata>
    <dc:title>Book Title</dc:title>
    <dc:creator opf:role="aut">Author Name</dc:creator>
    <meta name="calibre:series" content="Series Name"/>
    <meta name="calibre:series_index" content="1.0"/>
    <!-- Additional metadata -->
  </metadata>
  <manifest>
    <item href="book.pdf" media-type="application/pdf"/>
  </manifest>
</package>
```

### 2.2 Required Dependencies
- **XML Processing**: JDOM2 or similar
- **PDF Processing**: PDFBox 3.0+
- **Image Processing**: TwelveMonkeys ImageIO
- **Concurrency**: Kotlin Coroutines
- **Caching**: Caffeine

## 3. Implementation Plan

### 3.1 Phase 1: Core Parser (Weeks 1-2)

#### 3.1.1 OPF Parser Service
```kotlin
interface OpfMetadataParser {
    fun parseMetadata(opfFile: File): BookMetadata
    fun findOpfFile(bookFile: File): File?
    fun extractCoverImage(metadata: BookMetadata): ByteArray?
}

class CalibreOpfParser : OpfMetadataParser {
    private val xmlMapper = createXmlMapper()
    
    override fun parseMetadata(opfFile: File): BookMetadata {
        // Implementation using JDOM2
    }
}
```

#### 3.1.2 Metadata Model
```kotlin
data class BookMetadata(
    val title: String,
    val authors: List<Author>,
    val series: SeriesInfo?,
    val identifiers: Map<String, String>,
    val description: String?,
    val publishedDate: LocalDate?,
    val publisher: String?,
    val languages: List<String>,
    val tags: Set<String>,
    val rating: Int?,
    val coverImage: ByteArray?,
    val customFields: Map<String, String>
)

data class Author(val name: String, val role: String = "aut")
data class SeriesInfo(val name: String, val index: Float)
```

### 3.2 Phase 2: PDF Scanner Integration (Weeks 3-4)

#### 3.2.1 Enhanced PDF Scanner
```kotlin
class CalibrePdfScanner(
    private val opfParser: OpfMetadataParser,
    private val defaultScanner: PdfScanner
) : PdfScanner {
    
    override fun scan(book: Book, context: Context) {
        val opfFile = opfParser.findOpfFile(book.file)
        if (opfFile != null) {
            val metadata = opfParser.parseMetadata(opfFile)
            updateBookFromMetadata(book, metadata)
        } else {
            defaultScanner.scan(book, context)
        }
    }
    
    private fun updateBookFromMetadata(book: Book, metadata: BookMetadata) {
        // Update book fields from metadata
    }
}
```

### 3.3 Phase 3: Library Integration (Weeks 5-6)

#### 3.3.1 Configuration
```yaml
komga:
  calibre:
    enabled: true
    metadata-priority: calibre-first # or komga-first
    import-covers: true
    import-tags: true
    import-ratings: true
    watch-for-changes: true
    background-scan-interval: 1h
```

#### 3.3.2 Service Layer
```kotlin
@Service
class CalibreIntegrationService(
    private val opfParser: OpfMetadataParser,
    private val bookRepository: BookRepository,
    private val seriesRepository: SeriesRepository,
    @Value("${komga.calibre.background-scan-interval}")
    private val scanInterval: Duration
) {
    
    @Scheduled(fixedDelayString = "${komga.calibre.background-scan-interval}")
    fun syncCalibreMetadata() {
        // Background sync implementation
    }
    
    fun getCalibreMetadata(bookId: String): BookMetadata? {
        // Get metadata for a specific book
    }
}
```

## 4. AI and RAG Integration

### 4.1 RAG Implementation
- **Vector Database**: Chroma or FAISS
- **Embeddings**: All-MiniLM-L6-v2 or similar
- **LLM Integration**: OpenAI or local Llama 2

### 4.2 Features
1. **Semantic Search**
   - Natural language queries
   - Content-based recommendations

2. **Metadata Enhancement**
   - Automatic tagging
   - Summary generation
   - Content classification

3. **Smart Organization**
   - Duplicate detection
   - Series detection
   - Reading order suggestions

## 5. Performance Considerations

### 5.1 Caching Strategy
- **OPF Parsing**: Cache parsed metadata
- **Cover Images**: In-memory cache with disk persistence
- **Vector Store**: Incremental updates

### 5.2 Background Processing
- Use Kotlin Coroutines for async operations
- Implement work queues for large libraries
- Rate limiting for API calls

## 6. Testing Strategy

### 6.1 Unit Tests
- OPF parsing with various formats
- Metadata mapping
- Error conditions

### 6.2 Integration Tests
- Full scan process
- Database interactions
- File system operations

### 6.3 Performance Tests
- Large library scanning
- Memory usage
- Concurrent access

## 7. Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Core Parser | 2 weeks | OPF parsing, basic metadata model |
| 2. PDF Integration | 2 weeks | Enhanced scanner, cover handling |
| 3. Library Integration | 2 weeks | Background sync, configuration |
| 4. AI Features | 4 weeks | RAG implementation, semantic search |
| 5. Testing & Polish | 2 weeks | Performance optimizations, bug fixes |

## 8. Future Enhancements

1. **Two-way Sync**
   - Update OPF files from Komga
   - Batch metadata exports

2. **Advanced Features**
   - Custom metadata field mapping
   - Plugin system for format support
   - Enhanced reading experience

3. **Community Features**
   - Metadata sharing
   - User contributions
   - Plugin marketplace

## 9. Conclusion

This enhanced Calibre integration will transform Komga into a comprehensive digital library management system, combining the best features of Calibre's metadata management with Komga's modern web interface and reading experience. The implementation follows a phased approach to ensure stability and allows for iterative improvements based on user feedback.
