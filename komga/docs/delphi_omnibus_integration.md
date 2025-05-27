# Delphi Classics Omnibus Integration Plan

## 1. Overview

### 1.1 Problem Statement
Delphi Classics publishes comprehensive omnibus editions that contain multiple books within a single EPUB file. These collections need to be properly indexed and displayed as individual works in Komga while maintaining the convenience of the omnibus format.

### 1.2 Current Limitations
- Komga treats each EPUB as a single book
- No native support for splitting omnibus editions
- Limited metadata extraction for individual works within collections
- Inefficient handling of large table of contents

## 2. Technical Analysis

### 2.1 EPUB Structure Analysis
Delphi Classics EPUBs typically contain:
- A detailed HTML table of contents (TOC)
- Multiple XHTML files for each work
- Embedded metadata for individual works
- Consistent section headers and formatting

### 2.2 Required Dependencies
- **EPUB Processing**: epub-parse (existing)
- **HTML Parsing**: Jsoup
- **Text Processing**: Apache Tika
- **Metadata Extraction**: Existing Komga infrastructure

## 3. Implementation Plan

### 3.1 Phase 1: Omnibus Detection (Week 1)

#### 3.1.1 Detection Heuristics
```kotlin
interface OmnibusDetector {
    fun isOmnibus(epub: File): Boolean
    fun detectOmnibusType(epub: File): OmnibusType
}

enum class OmnibusType {
    DELPHI_CLASSICS,
    OTHER
}
```

#### 3.1.2 TOC Analysis
- Parse EPUB TOC for hierarchical structure
- Identify individual work boundaries
- Extract work titles and page ranges

### 3.2 Phase 2: Work Extraction (Weeks 2-3)

#### 3.2.1 Virtual Book Model
```kotlin
data class VirtualBook(
    val id: String,
    val title: String,
    val author: String,
    val startLocation: String,
    val endLocation: String,
    val metadata: BookMetadata,
    val coverImage: ByteArray? = null
)
```

#### 3.2.2 Content Splitting
- Create virtual book entries for each work
- Map TOC entries to content fragments
- Handle cross-references and notes

### 3.3 Phase 3: Metadata Enhancement (Week 4)

#### 3.3.1 Metadata Sources
- Extract from TOC structure
- Parse title pages of individual works
- Utilize existing Komga metadata sources
- Support custom metadata overrides

#### 3.3.2 Series Handling
- Detect series information
- Maintain reading order
- Handle multi-volume collections

### 3.4 Phase 4: User Interface (Weeks 5-6)

#### 3.4.1 Omnibus Browser
- Hierarchical view of omnibus contents
- Expand/collapse works
- Progress tracking per work

#### 3.4.2 Reading Experience
- Seamless navigation between works
- Remember last read position per work
- Visual indicators for omnibus vs. individual works

## 4. Technical Implementation

### 4.1 Database Schema Updates
```sql
CREATE TABLE omnibus_books (
    id VARCHAR(36) PRIMARY KEY,
    file_path VARCHAR(1024) NOT NULL,
    type VARCHAR(50) NOT NULL,
    metadata JSONB
);

CREATE TABLE virtual_books (
    id VARCHAR(36) PRIMARY KEY,
    omnibus_id VARCHAR(36) NOT NULL,
    title VARCHAR(512) NOT NULL,
    author VARCHAR(512),
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255) NOT NULL,
    metadata JSONB,
    FOREIGN KEY (omnibus_id) REFERENCES omnibus_books(id)
);
```

### 4.2 API Endpoints
```kotlin
@RestController
@RequestMapping("/api/v1/omnibus")
class OmnibusController {
    @GetMapping("/{id}/contents")
    fun getContents(@PathVariable id: String): List<VirtualBookDto>
    
    @GetMapping("/{id}/read/{workId}")
    fun readWork(
        @PathVariable id: String,
        @PathVariable workId: String
    ): ReadingSession
    
    @PostMapping("/import")
    fun importOmnibus(@RequestParam file: MultipartFile): OmnibusImportResult
}
```

### 4.3 Performance Considerations
- Lazy loading of omnibus contents
- Caching of parsed TOC and metadata
- Background processing for large collections
- Incremental indexing

## 5. User Experience

### 5.1 Library View
- Special omnibus badge
- Expandable entries
- Progress indicators

### 5.2 Reading Interface
- Work selector
- Navigation between works
- Progress tracking

### 5.3 Import Process
- Drag-and-drop import
- Progress indicators
- Error reporting

## 6. Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Omnibus Detection | 1 week | Detection logic, TOC parsing |
| 2. Work Extraction | 2 weeks | Virtual book model, content splitting |
| 3. Metadata Enhancement | 1 week | Metadata extraction, series handling |
| 4. User Interface | 2 weeks | Omnibus browser, reading experience |
| 5. Testing & Polish | 2 weeks | Performance optimization, bug fixes |

## 7. Future Enhancements

1. **Batch Processing**
   - Bulk import of multiple omnibus editions
   - Background processing queue

2. **Custom Splitting Rules**
   - User-defined patterns
   - Machine learning for automatic detection

3. **Enhanced Metadata**
   - Cover generation for individual works
   - Detailed publication info
   - Links between related works

4. **Export Options**
   - Split into individual EPUBs
   - Custom compilation creation

## 8. Conclusion

This implementation will transform how Komga handles large omnibus editions, making it possible to manage and read Delphi Classics collections with the same ease as individual books. The solution maintains the benefits of the omnibus format while providing the organizational advantages of individual works.
