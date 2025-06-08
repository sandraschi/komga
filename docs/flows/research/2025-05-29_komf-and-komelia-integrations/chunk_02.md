# Komf and Komelia: Detailed Exploration

This document provides a more detailed look into Komf and Komelia, based on their respective GitHub README files and repository information.

## 1. Komf - In-Depth

Komf is a sophisticated metadata fetcher designed to work with Komga and Kavita media servers.

*   **Core Functionality Expanded:**
    *   Beyond basic fetching, Komf offers fine-grained control over metadata sources and how data is applied.
    *   The userscript ([Snd-R/komf-userscript](https://github.com/Snd-R/komf-userscript)) provides seamless UI integration for triggering Komf actions from within Komga/Kavita.

*   **Deployment Options:**
    *   **JAR:** Requires Java 17+. Run with `java -jar komf-1.0-SNAPSHOT-all.jar <path_to_config_file>`.
    *   **Docker:** An official Docker image (`sndxr/komf:latest`) is available. Configuration can be passed via environment variables or a mounted `application.yml` file.

*   **Configuration (`application.yml`) Highlights:**
    *   **Connection:** Separate sections for Komga (username/password) and Kavita (API key).
    *   **Event Listener:** `enabled: true` allows Komf to automatically detect new series. Can be limited to specific `libraries` (by ID).
    *   **Metadata Update (`metadataUpdate`):**
        *   **`updateModes`**: `API` (writes to Komga/Kavita database, non-destructive) or `COMIC_INFO` (writes to `ComicInfo.xml` files, potentially modifying local files). Multiple modes can be used.
        *   **`aggregate`**: If `true`, combines data from multiple providers. If `false` (default), uses the first provider (by priority) that returns a match.
        *   **Cover Updates:** Separate toggles for `bookCovers` and `seriesCovers`.
        *   **Post-Processing (`postProcessing`):** Options to update series titles (with `titleType`: `LOCALIZED`, `ROMAJI`, `NATIVE`), add alternative titles, order books by volume/chapter, override reading direction, and set a default language (BCP 47).
    *   **Per-Library Configuration:** Metadata update options and provider lists can be customized for specific Komga/Kavita library IDs, overriding default settings.
    *   **Metadata Providers (`metadataProviders`):
        *   Supported: MangaUpdates, MyAnimeList (MAL), Nautiljon, AniList, YenPress, Kodansha, Viz, BookWalker.
        *   Each provider has `priority` and `enabled` settings.
        *   MAL requires a `malClientId`.
        *   **Field-Level Aggregation Control:** If aggregation is enabled, users can specify which metadata fields (e.g., `status`, `title`, `summary`, `publisher`, `genres`, `tags`, `authors`, `thumbnail`, `releaseDate`) should be sourced from which provider for both series and books. This allows, for example, getting a summary from one provider but a thumbnail from another if the first didn't provide one.
    *   **Discord Notifications:** Send messages to Discord webhooks when new books/series are added. Message format is customizable using Apache Velocity templates (`discordWebhook.vm`). Can include series covers (requires an Imgur Client ID for uploading).
    *   **Database:** Uses an SQLite file (`database.sqlite`) for its own data storage.
    *   **Server:** Runs an HTTP server, typically on port `8085`.

*   **Operational Modes:**
    *   **Server Mode (Daemon):** Runs continuously, listening for events and serving API requests.
    *   **CLI Mode:** For one-off operations:
        *   `series search <NAME>`
        *   `series update <ID>` (auto-identifies)
        *   `series identify <ID>` (manual identification from provider results)
        *   `series reset <ID>`
        *   `library update <ID>` (updates all series in library)
        *   `library reset <ID>`

*   **HTTP API Endpoints:**
    *   Provides a RESTful API for most of its functionalities, allowing programmatic control or integration with other tools. Endpoints exist for listing providers, searching, identifying, matching, and resetting metadata for series and libraries.

## 2. Komelia - In-Depth

Komelia is a multi-platform client application for Komga, focusing on the media consumption experience.

*   **Platforms and Distribution:**
    *   **Desktop:** Windows (MSI installer), Linux (DEB package, AUR package for Arch Linux).
    *   **Mobile:** Android (available on F-Droid and via direct APK download from GitHub Releases).
    *   Prebuilt binaries are available from the [GitHub Releases page](https://github.com/Snd-R/Komelia/releases).

*   **Build Process & Technology:**
    *   **Core Language:** Kotlin.
    *   **UI Framework:** Likely Jetpack Compose for both Desktop and Android, enabling a modern, declarative UI.
    *   **Native Components:** Involves building non-JVM (native) libraries using Docker for cross-platform compilation (`linux-x86_64`, `windows-x86_64`, `android-arm64`, `android-x86_64`). These are then bundled as JNI libraries. This suggests use of C/C++/Rust for performance-sensitive tasks or deep platform integration (e.g., image upscaling, file system access).
    *   **EPUB Reader:** Includes a dedicated EPUB reader component built as a web UI (requires `npm` for its `buildWebui` Gradle task).
    *   **Build System:** Gradle, with JDK 17+ required for desktop builds.

*   **Key Features (Inferred and Stated):**
    *   **Dedicated Komga Client:** Provides an alternative to accessing Komga via a web browser, potentially offering a more integrated and feature-rich experience.
    *   **Enhanced Reading:** Aims to improve the reading experience for comics, manga, and ebooks from Komga.
    *   **Image Upscaling:** Previous search results indicated OnnxRuntime for image upscaling, which would be beneficial for lower-resolution images on high-resolution displays.
    *   **Offline Access (Potential):** While not confirmed as fully implemented in the README, it's a common feature for dedicated media clients and was noted as a feature request.

*   **Installation Packages:**
    *   Desktop: UberJAR, DEB (Linux), MSI (Windows).
    *   Android: APK.

**In summary, Komf is a powerful backend tool for metadata management, while Komelia is a user-facing client application for an enhanced media consumption experience on multiple platforms.**

---
Next steps involve searching for other Komga-related repositories.
