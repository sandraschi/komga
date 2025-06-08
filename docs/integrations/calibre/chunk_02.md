# Calibre Documentation - Part 2: Synergies - Calibre and Komga Working Together

While both Calibre and Komga are powerful tools for digital media, they excel in different areas and can be used synergistically to create a highly organized, well-described, and accessible e-book and comic library. Calibre often serves as the meticulous "librarian" for preparing and curating content, while Komga acts as the robust "server and reader" for accessing and enjoying it.

## 1. Preparing Your Library with Calibre for Komga

Using Calibre as the primary tool for organizing and polishing your collection before Komga ingests it can significantly enhance your Komga experience.

*   **Centralized Curation:** Calibre provides a single interface to manage, sort, tag, and clean up your e-books and comics. This ensures consistency before they are introduced to Komga.
*   **Directory Structure and Naming:**
    *   Calibre, by default, organizes books into an `Author/Title/files` structure. While Komga is flexible, a clean and consistent structure managed by Calibre can simplify library management.
    *   Komga typically expects a structure like `Series Name/Series Name - IssueNumber.cbz` or `Author Name/Book Title.epub`.
    *   You can configure Calibre's "Save to disk" template to match Komga's preferred naming conventions if you are exporting files from Calibre to a separate Komga library folder. However, a more common approach is to let Komga read directly from a Calibre library folder, relying on embedded metadata for organization within Komga.
*   **One Book per Folder (Calibre Default):** Calibre typically stores each book (and its various formats) in its own folder. Komga handles this well, identifying each file as a potential book within a series (the parent folder).

## 2. Metadata Mastery: The Core of the Synergy

Komga's ability to display rich metadata is significantly enhanced when that metadata is meticulously managed in Calibre and embedded into the files.

*   **Leveraging Calibre's Metadata Fetching & Editing:**
    *   Calibre can download metadata from numerous online sources (Goodreads, Amazon, ComicVine via plugins, etc.).
    *   It offers powerful tools for manual editing, bulk editing, and creating custom metadata fields (though Komga will only recognize standard fields from embedded files).
*   **Ensuring Accuracy for Komga:**
    *   **For Comics (CBZ/CBR via `ComicInfo.xml`):**
        *   **Key Fields:** Title, Series, Issue Number, Volume, Authors (Writer, Penciller, Inker, Colorist, Letterer, CoverArtist, Editor), Summary, Publisher, Publication Date (Year, Month, Day), Tags, Genre, Language (ISO code), Reading Direction (`Manga: YesAndRightToLeft`), Age Rating, Web Links, Story Arc, Series Group (for collections).
        *   **Calibre Plugin: `Embed Comic Metadata`:** This plugin is crucial. It takes the metadata stored in Calibre's database and writes it into a `ComicInfo.xml` file inside each CBZ/CBR archive. Ensure the plugin's option to "Write metadata in `ComicInfo.xml`" is enabled.
        *   Komga reads this `ComicInfo.xml` file to populate its database for both book-specific and series-level details.
    *   **For E-books (EPUB via OPF metadata):**
        *   **Key Fields:** Title (`dc:title`), Authors (`dc:creator` with roles), Summary (`dc:description`), Publisher (`dc:publisher`), Publication Date (`dc:date`), Language (`dc:language`), ISBN (`dc:identifier`).
        *   **Series Title (for EPUBs in Komga):** Komga can derive the series title from the `belongs-to-collection` meta property within the EPUB's OPF file. Calibre's metadata editor for EPUBs should be used to ensure these fields are correctly populated.
        *   Calibre automatically manages the OPF metadata within EPUB files when you edit metadata in its interface.
*   **Benefits for Komga:**
    *   **Rich Browsing:** Accurate series names, issue numbers, summaries, genres, and author roles make browsing in Komga much more effective and enjoyable.
    *   **Correct Grouping:** Ensures books are correctly grouped into series and that series information (like total issue count, reading direction) is accurate.
    *   **Powerful Filtering & Sorting:** Populated tags and genres in Komga allow for better discovery.
    *   **Collections & Read Lists:** Metadata like `SeriesGroup` and `StoryArc` from `ComicInfo.xml` can automatically populate Komga collections and read lists.

## 3. Format Conversion for Optimal Reading

Calibre's robust conversion engine can be used to prepare files in formats that Komga handles best and that provide an optimal reading experience.

*   **Target Formats for Komga:**
    *   **Comics:** CBZ (ZIP archive with images) and CBR (RAR archive with images) are primary. PDF is also supported.
    *   **E-books:** EPUB is well-supported. PDF can also be used.
*   **Using Calibre for Conversion:**
    *   **Standardizing Comic Formats:** Convert loose image folders, PDFs, or other archive types (e.g., CB7, CBT) into CBZ format using Calibre. The `Embed Comic Metadata` plugin can also assist by converting CBR to CBZ to facilitate metadata embedding.
    *   **Optimizing EPUBs:** Convert MOBI, AZW, or other e-book formats to EPUB. Calibre's conversion settings allow for fine-tuning the output, such as adjusting styles, ensuring a valid table of contents, and cleaning up formatting.
    *   **PDFs:** While Komga supports PDFs, they are often less ideal for reflowable reading. Calibre can attempt to convert PDFs to EPUB, though results can vary depending on the PDF's complexity.
*   **Considerations:**
    *   Conversion can sometimes result in quality loss or formatting issues, especially with complex source files. Always review converted files.
    *   Ensure conversion settings in Calibre are optimized for readability (e.g., font embedding, page setup for comics).

## 4. Workflow Examples

Here are a couple of common workflows leveraging both Calibre and Komga:

**Workflow 1: Calibre as Master Librarian, Komga as Server**

1.  **Acquisition:** New books/comics are added to Calibre.
2.  **Metadata Management (Calibre):**
    *   Fetch metadata from online sources.
    *   Manually edit and refine metadata (series, issue, authors, summary, tags, ratings, etc.).
    *   For comics, use the `Embed Comic Metadata` plugin to write data to `ComicInfo.xml` within the CBZ/CBR files.
    *   For EPUBs, ensure standard metadata is correct (Calibre handles embedding into the OPF automatically).
3.  **Format Conversion (Calibre, if needed):** Convert files to CBZ or EPUB.
4.  **Library Setup (Komga):**
    *   Point Komga to your Calibre library folder(s) or a folder where Calibre saves/exports files.
    *   Ensure Komga's library settings are configured to parse `ComicInfo.xml` and EPUB metadata.
5.  **Scanning (Komga):** Komga scans the library, reads the embedded metadata, and populates its database.
6.  **Access & Reading (Komga):** Access your well-organized library via Komga's web interface or compatible clients (like Tachiyomi, Paperback).

**Workflow 2: Separate Libraries, Calibre for Preparation**

1.  **Curation (Calibre):** Use Calibre to manage a "staging" or "master" library. Perfect metadata and convert formats here.
2.  **Export (Calibre):** Use Calibre's "Save to disk" feature to export cleaned and metadata-embedded files to a separate directory structure specifically for Komga.
    *   This allows for a different directory structure for Komga if desired, or to only expose a subset of your Calibre library to Komga.
3.  **Komga:** Manages its library based on these exported files.

**Key to Success:** The most crucial step is ensuring that the rich metadata managed in Calibre is successfully embedded into the actual book/comic files in a format that Komga can read and understand. For comics, this is overwhelmingly `ComicInfo.xml`.
