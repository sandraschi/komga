# Komga Ecosystem: Additional Tools and Integrations

This document details other noteworthy Komga-related projects found on GitHub, expanding on the ecosystem beyond Komf and Komelia.

## 1. Klutter (`frameset/klutter`)

*   **Purpose:** A streaming client application for Komga, designed for mobile platforms.
*   **Platforms:** Android and iOS.
*   **Technology:** Built with Dart and the Flutter framework.
*   **Availability:**
    *   Google Play Store: [Link](https://play.google.com/store/apps/details?id=uk.winckle.klutter)
    *   Apple App Store (mentioned in its README).
*   **Current Status:** Described as "early stages." iOS version was noted as "not yet compiled" in the README's main text but listed as available on the App Store in the download section.
*   **Key Features:**
    *   Paginated views for Libraries, Series, Collections.
    *   Home page sections: "Recently Read," "On Deck."
    *   Search for books and series.
    *   Reader with zoom support.
    *   Dark mode.
*   **Planned Features:** Readlists, library view filtering, browsing speed caching.
*   **Not Planned:** Offline reading, desktop support.
*   **Dependencies:** `flutter_bloc`, `retrofit.dart`, `photo_view`.
*   **Community:** Discussed on the official Komga Discord (#3rd-party-apps channel).

## 2. Komga Client SDK (`primelib/komga-client`)

*   **Purpose:** Provides Software Development Kits (SDKs) for interacting with the Komga server's API.
*   **Target Audience:** Developers looking to build custom applications, scripts, or integrations with Komga.
*   **Provided Libraries (SDKs):**
    *   Go
    *   Java
*   **License:** MIT.
*   **Benefit:** Simplifies the process of programmatically accessing and manipulating Komga data by abstracting direct API calls.

## 3. Komga-Scripts (`PhilippKammann/Komga-Scripts`)

*   **Purpose:** A collection of Python scripts for various administrative, automation, and enhancement tasks for Komga.
*   **Origin:** Community-provided (from the Komga Discord).
*   **Setup:** Requires Python. Some scripts use a `.env` file for configuration (e.g., `KOMGA_URL`, `KOMGA_USER`, `KOMGA_PASSWORD`).
*   **Available Scripts:**
    *   **`resetKomgaPassword.py`**: Resets a Komga user's password by directly modifying the `database.sqlite` file. Prompts for database path, user, and new password.
    *   **`updateSortTitle.py`**: Modifies series sort titles by moving leading articles (e.g., "The", "A") to the end (e.g., "Title, The").
    *   **`emailNotification.py`**: Sends email notifications to Komga users about newly added books. Requires SMTP server configuration and is intended for use with cron jobs.
    *   **`anilist_collection.py`**: Creates Komga collections based on a user's Anilist manga lists (reading, planned, completed). Requires Anilist username and Komga library IDs.

## 4. Kombo (`soda3x/Kombo`)

*   **Purpose:** A Docker container that automatically converts CBZ/CBR comic files to EPUB format.
*   **Primary Use-Case:** To enable Komga's native "Kobo Sync" feature, which requires EPUB files.
*   **Technology:** Docker container wrapping the `kcc` (Kindle Comic Converter) tool.
*   **Operation:**
    *   Monitors an `/input` directory for CBZ/CBR files.
    *   Converts them to EPUB (or other specified format via `FORMAT` env var).
    *   Outputs converted files to an `/output` directory (this would be a Komga library).
    *   Uses a `/config` volume for persistence to avoid re-converting files.
*   **Configuration (Docker Compose):**
    *   `PROFILE`: KCC conversion profile (e.g., for specific Kobo devices).
    *   `FORMAT`: Target output format (e.g., `EPUB`).
    *   Volume mounts for `/input`, `/output`, and `/config`.

## 5. komga-sync (`lmaonator/komga-sync`)

*   **Purpose:** A userscript to synchronize manga chapter reading progress from Komga to external tracking websites.
*   **Supported Tracking Sites:** MangaUpdates, MyAnimeList (MAL), AniList.
*   **How it Works:**
    *   When reading a chapter in Komga, if the series has linked tracking site URLs in its Komga metadata, the script checks and updates the chapter progress on the respective site (if Komga progress is greater).
    *   Requires users to log into tracking sites via the script's interface.
*   **Chapter Number Source:** Uses Komga metadata by default (prefers `ComicInfo.xml`). Can optionally parse filenames.
*   **Installation:** Via a userscript manager (e.g., Violentmonkey) using a `.user.js` link.
*   **Interface:** Adds a "Komga Sync" button to Komga's series pages for managing connections and linking series.
*   **Bonus Feature:** Includes an image cropping tool accessible while reading.

These tools highlight a vibrant community around Komga, extending its capabilities for metadata management, client access, device integration, and external service synchronization.
