# Calibre Documentation - Part 4: Komga Fork - Enhanced Calibre Integration via Plugin

This Komga fork includes a dedicated Calibre plugin designed to provide seamless integration and optimization for users who manage their libraries in Calibre and use this Komga instance as their primary reading platform. The plugin offers tools to prepare, synchronize, and optimize your Calibre library for the best experience with Komga.

## 1. Overview of the Komga Calibre Plugin

The plugin aims to bridge the gap between Calibre's powerful library management capabilities and Komga's strengths as a modern media server for books and comics.

**Key Goals:**

*   Simplify the process of making Calibre-managed content available in Komga.
*   Optimize file formats and metadata for optimal display and performance within Komga.
*   Provide flexibility in how libraries are structured and synchronized.

## 2. Core Features

*   **Automatic Library Conversion/Optimization:** Adapts your Calibre library structure, or exports books, in a way that Komga can efficiently process.
*   **Metadata Synchronization:** Facilitates keeping metadata consistent between Calibre (as the source of truth) and Komga. This typically involves embedding metadata from Calibre into files before Komga reads them.
*   **Format Optimization:** Converts various e-book and comic formats into those best suited for web-based reading and Komga's internal processing (primarily EPUB for e-books and CBZ for comics).
*   **Series Management:** Leverages Calibre's series metadata to ensure books are correctly grouped and displayed as series within Komga.
*   **Bulk Operations:** Supports both exporting individual books and performing synchronization tasks for an entire Calibre library or selected portions.

## 3. Getting Started

### Prerequisites

*   A working Calibre installation (version 5.0 or later is generally recommended for compatibility with modern plugin features).
*   This specific Komga fork server (version 1.0.0 or later, as per plugin design).
*   Sufficient disk space, especially if performing format conversions, as temporary files will be generated.

### Installation

1.  **Obtain the Plugin:** The plugin file (e.g., `komga_calibre_plugin.zip`) should be available with the resources for this Komga fork.
2.  **Install in Calibre:**
    *   Open Calibre.
    *   Navigate to `Preferences` -> `Plugins` (under the "Advanced" section).
    *   Click `Load plugin from file`.
    *   Select the `komga_calibre_plugin.zip` file and confirm.
    *   Restart Calibre to activate the plugin.

### Configuration

Once installed, the plugin will need to be configured:

1.  In Calibre, go to `Preferences` -> `Plugins`.
2.  Find the "Komga" plugin in the list (the exact name might vary) and select it.
3.  Configure the necessary settings, which typically include:
    *   **Komga Server URL:** The address of your Komga server instance.
    *   **Komga Credentials:** Username and password for a Komga user with appropriate permissions to manage libraries and metadata (if the plugin interacts directly with Komga's API for certain features).
    *   **Optimization Settings:** Preferred defaults for format conversion, metadata handling, and file structure.

## 4. Usage Scenarios

The plugin generally offers two main ways to get your books from Calibre to Komga:

### Syncing/Exporting a Single Book

This is useful for quickly adding a new book or updating an existing one in Komga.

1.  In Calibre, right-click on the book you wish to export.
2.  Look for an option like "Export to Komga" or similar in the context menu (provided by the plugin).
3.  A dialog may appear allowing you to choose specific optimization options for this export (e.g., target format, metadata handling).
4.  Confirm the export.

### Syncing/Exporting Your Entire Library (or Parts Of It)

This is for initial setup or large-scale updates.

1.  Access the plugin's main interface, often via a dedicated icon on the Calibre toolbar or through the `Preferences` -> `Plugins` menu.
2.  Select an option like "Sync Entire Library" or "Bulk Export to Komga."
3.  Configure the synchronization options carefully:
    *   **Format Conversion:** Strongly recommended to convert to Komga-friendly formats (EPUB, CBZ).
    *   **Metadata Update:** Ensure Calibre's metadata is embedded/updated in the files Komga will read.
    *   **Thumbnail Generation:** The plugin might offer to pre-generate thumbnails (though Komga typically does this itself).
    *   **Temporary File Cleanup:** Option to automatically clean up intermediate files after processing.
4.  Start the synchronization process. This can take a significant amount of time for large libraries.

## 5. Key Optimization Options

The plugin provides several options to control how your library is processed:

### Format Conversion

| Original Format | Recommended for Komga | Notes                                   |
|-----------------|-------------------------|-----------------------------------------|
| EPUB            | ✅ EPUB (no change)     | Already optimal for text-based books.   |
| CBZ             | ✅ CBZ (no change)      | Already optimal for comics/manga.       |
| PDF             | ➡️ EPUB or CBZ         | Convert for better reading experience.  |
| MOBI, AZW       | ➡️ EPUB                | Convert to the open EPUB standard.      |
| Other/RAR/CBR*  | ➡️ CBZ                 | Standardize comic archives to CBZ.      |

(*Note: While Komga reads CBR, standardizing to CBZ via Calibre, especially with `ComicInfo.xml` embedding, is a good practice.)*

### Metadata Handling

*   **Prioritize Calibre Metadata:** The general best practice is to use Calibre as the master source for metadata. The plugin should facilitate embedding this metadata (e.g., into `ComicInfo.xml` for comics, or standard EPUB OPF for e-books) so Komga can read it accurately.
*   **Komga Enhancement (Optional):** Some workflows might involve letting Komga fetch additional metadata if its sources are preferred for certain fields, but this should be configured carefully to avoid conflicts with Calibre's data.
*   **Custom Field Mapping:** For advanced users, the plugin might offer a way to define how specific Calibre metadata fields map to Komga's expected fields, especially if custom columns are heavily used in Calibre.
    *Example JSON for mapping (conceptual):*
    ```json
    {
      "calibre_series_column": "series.name",
      "calibre_issue_column": "series.position",
      "calibre_summary_column": "summary",
      "#custom_publisher_column": "publisher.name"
    }
    ```

### File Structure for Komga

The plugin may offer options for how files are organized when exported or placed in a Komga-accessible location:

*   **Flat Structure:** All book files placed directly into a single directory per library. Simpler but can be hard to navigate manually.
*   **Hierarchical Structure:** Books organized into subdirectories, often `Author/Series/Book files` or `Series/Book files`. Generally better for large libraries and easier manual inspection.
*   **Calibre-Style Structure:** If Komga is reading directly from a Calibre library folder, this structure is inherently used. The plugin's role here is more about ensuring metadata is embedded correctly within this existing structure.

## 6. Best Practices for Using the Plugin

*   **Backup Your Calibre Library:** Before performing large-scale operations like a full library sync or conversion, always back up your Calibre library and configuration.
*   **Test with a Small Sample:** Export or sync a few representative books first to ensure your settings are correct and the results in Komga are as expected.
*   **Monitor Disk Space:** Format conversions can consume significant temporary disk space. Ensure you have enough free space before starting large jobs.
*   **Schedule During Off-Peak Hours:** Full library syncs can be resource-intensive (CPU, disk I/O). Running them during periods of low system usage is advisable.

## 7. Troubleshooting Common Issues

*   **Authentication Failed:**
    *   Double-check Komga server URL, username, and password in the plugin settings.
    *   Ensure the Komga user account has the necessary permissions (e.g., to access/modify libraries if the plugin interacts via API).
*   **Format Not Supported for Conversion:**
    *   Some source formats might require additional Calibre plugins (e.g., specific DRM removal plugins, if applicable and legal, or input format plugins).
    *   Try converting the problematic file to an intermediate, more common format within Calibre first, then use the Komga plugin.
*   **Sync Stuck or Slow:**
    *   Check network connectivity between the machine running Calibre and the Komga server (if applicable).
    *   Reduce the batch size or number of concurrent operations in the plugin's settings if your system is overloaded.
    *   Consult plugin logs and Komga server logs for specific error messages.
*   **Log Locations:**
    *   **Calibre Plugin Logs:** Often found in Calibre's configuration directory (e.g., `~/.config/calibre/plugins/komga_plugin_name.log` or similar).
    *   **Komga Server Logs:** Refer to your Komga installation's documentation for log file locations.

## 8. Advanced Configuration & Performance

*   **Custom Calibre Conversion Profiles:** If the plugin allows, you can select pre-configured Calibre conversion profiles (set up in `Preferences` -> `Common Options` -> `Output Options`) for more granular control over format conversion.
*   **Performance Tips:**
    *   Temporarily disable other non-essential Calibre plugins during large sync operations to free up resources.
    *   Adjust batch processing sizes: smaller batches use less memory but may take longer overall; larger batches are faster but more memory-intensive.
    *   Using SSD storage for your Calibre library and temporary conversion folders significantly improves performance.
    *   Limit the number of concurrent conversion operations if the plugin allows, to match your system's capabilities.

## 9. Potential Future Enhancements (Examples from the Fork's Vision)

*   True two-way synchronization of metadata and read status between Calibre and Komga.
*   Support for a wider range of less common file formats.
*   More sophisticated duplicate detection mechanisms.
*   Automated library maintenance tasks triggered from Calibre.

This Calibre plugin, specific to your Komga fork, aims to provide a superior and streamlined experience for users who wish to leverage the strengths of both platforms.
