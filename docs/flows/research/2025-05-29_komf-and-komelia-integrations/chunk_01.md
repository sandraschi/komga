# Komf and Komelia: Enhancing the Komga Experience

This document explores two related projects, Komf and Komelia, which are designed to integrate with and enhance the functionality of the Komga media server. Both projects appear to be developed by GitHub user Snd-R.

## 1. Komf: Metadata Fetcher

*   **Repository:** [Snd-R/komf](https://github.com/Snd-R/komf)
*   **Purpose:** Komf serves as a metadata fetcher for both Komga and Kavita (another media server for comics and manga).
*   **Core Functionality:**
    *   **Automated Metadata Retrieval:** Komf can automatically detect newly added series in your Komga/Kavita library and fetch relevant metadata and thumbnails for them.
    *   **Manual Identification:** It provides tools for users to manually search for and identify series if automatic matching is insufficient or incorrect.
    *   **Library-Wide Matching:** Users can trigger metadata matching for an entire library or specific series.
*   **Technology:** Komf is a Java application (requiring Java 17 or higher) and is built using Gradle. The output is a `shadowjar` (a JAR file containing all its dependencies).
*   **User Interface Integration (`komf-userscript`):**
    *   **Repository:** [Snd-R/komf-userscript](https://github.com/Snd-R/komf-userscript)
    *   This companion project provides a userscript (likely for use with browser extensions like Tampermonkey or Greasemonkey) that integrates Komf's functionality directly into the Komga and Kavita web UIs. This allows users to trigger metadata identification and other Komf actions without leaving the Komga/Kavita interface.

**In essence, Komf addresses the need for richer metadata in Komga, automating the process of finding and applying details like series summaries, publisher information, character data, and cover art that might not be embedded in the comic files themselves.**

## 2. Komelia: Media Client

*   **Repository:** [Snd-R/Komelia](https://github.com/Snd-R/Komelia)
*   **Purpose:** Komelia acts as a dedicated media client for Komga.
*   **Core Functionality (Inferred from repository and issues):**
    *   **Enhanced Reader:** It aims to provide an improved or alternative reading experience for media served by Komga. Release notes mention reusing and modifying Komga's web UI EPUB reader, suggesting a focus on enhancing how users interact with books and comics.
    *   **Cross-Platform Potential:** As a client application, it might offer native desktop or mobile experiences, though the exact platforms are not immediately clear from the initial search.
    *   **Image Upscaling:** Release notes mention OnnxRuntime upscaling, indicating features to improve image quality, especially when viewing smaller images on larger displays.
    *   **Offline Support (Feature Request):** An issue on the repository requests offline support, which is a common desire for media clients, allowing users to download and access content without a constant connection to the Komga server.
*   **Technology:** Komelia is a Kotlin-based project.

**Komelia appears to focus on the consumption side of Komga, offering a potentially more feature-rich or specialized client for reading and interacting with the media managed by Komga, possibly with added benefits like image upscaling and offline capabilities.**

## Relationship to Komga

Both Komf and Komelia are third-party tools designed to complement Komga:

*   **Komf** enhances the *metadata management* aspect of Komga.
*   **Komelia** enhances the *media consumption/reading* aspect of Komga.

They are not part of the core Komga project but rather tools developed by a community member to extend its ecosystem and provide additional value to Komga users.

--- 
Further details would require a deeper dive into each project's README, documentation (if any), and potentially their source code or release notes.
