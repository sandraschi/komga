# Komga Repository Analysis

## Overview
Komga is a modern, open-source media server designed for managing and reading digital comics, mangas, BDs, and eBooks. It's built with Kotlin and the Spring Boot framework, providing a web-based interface for users to organize and access their digital collections.

## Key Components

### 1. Core Technologies
- **Language**: Kotlin (v1.9.21)
- **Framework**: Spring Boot (v3.4.0)
- **Build Tool**: Gradle (v8.11.1)
- **Database**: Uses JOOQ for database access with Flyway for migrations
- **Frontend**: Thymeleaf for server-side templating

### 2. Project Structure
- **komga/**: Main application module
  - `src/main/kotlin/`: Kotlin source code
  - `src/main/resources/`: Configuration and static resources
  - `src/test/`: Test files
  - `src/benchmark/`: Performance benchmarking code
  - `src/flyway/`: Database migration scripts

- **komga-tray/**: System tray application
- **komga-webui/**: Web user interface components

### 3. Key Features
- Web-based reader with responsive design
- Library management with metadata editing
- User management with access control
- REST API and OPDS support
- Integration with Kobo eReaders
- Duplicate detection for files and pages
- Import functionality for external sources

### 4. Technical Stack
- **Web**: Spring Web MVC, WebFlux
- **Security**: Spring Security with OAuth2
- **Database**: JOOQ with Flyway migrations
- **Search**: Apache Lucene
- **Document Processing**: Apache Tika, PDFBox
- **Image Processing**: Thumbnailator, TwelveMonkeys ImageIO
- **API Documentation**: SpringDoc OpenAPI

### 5. Development Tools
- KTLint for code style
- JUnit 5 for testing
- Jacoco for code coverage
- JReleaser for release management

### 6. Build and Deployment
- Supports building with Gradle
- Docker support available
- CI/CD integration via GitHub Actions

### 7. Dependencies
- Comprehensive set of libraries for:
  - File format support (PDF, CBZ, CBR, etc.)
  - Image processing (WebP, HEIF, JPEG 2000, etc.)
  - Barcode scanning
  - Internationalization (ICU4J)

## Development Status
The project is actively maintained with regular updates. It follows semantic versioning and has a well-structured codebase with good test coverage.

## Getting Started
For development setup, refer to the [DEVELOPING.md](../DEVELOPING.md) file in the repository.

## Repository Information
- **License**: MIT
- **Maintainer**: Gauthier Roebroeck
- **Website**: [https://komga.org](https://komga.org)
- **GitHub**: [https://github.com/gotson/komga](https://github.com/gotson/komga)

## Contribution
Contributions are welcome! Please refer to the [CONTRIBUTING.md](../CONTRIBUTING.md) file for guidelines.
