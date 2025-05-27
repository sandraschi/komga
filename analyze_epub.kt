import nl.siegmann.epublib.epub.EpubReader
import java.io.FileInputStream
import java.io.File

fun main() {
    val epubFile = File("L:/Multimedia Files/Written Word/Calibre-Bibliothek/William Shakespeare/Complete Works of William Shakespea (4331)/Complete Works of William Shake - William Shakespeare.epub")
    
    if (!epubFile.exists()) {
        println("File not found: ${epubFile.absolutePath}")
        return
    }
    
    println("Analyzing EPUB: ${epubFile.name}")
    println("File size: ${epubFile.length()} bytes")
    
    try {
        val epubReader = EpubReader()
        val book = epubReader.readEpub(FileInputStream(epubFile))
        
        // Print metadata
        println("\n=== METADATA ===")
        println("Title: ${book.metadata.titles.joinToString()}")
        println("Authors: ${book.metadata.authors.joinToString { "${it.firstname} ${it.lastname}" }}")
        println("Language: ${book.metadata.language}")
        
        // Print table of contents
        println("\n=== TABLE OF CONTENTS ===")
        printToc(book.tableOfContents.tocReferences, "")
        
        // Print resources
        println("\n=== RESOURCES (first 20) ===")
        book.resources.all.entries.take(20).forEach { (href, resource) ->
            println("${resource.href.padEnd(60)} ${resource.mediaType} (${resource.size} bytes)")
        }
        
        println("\nTotal resources: ${book.resources.size()}")
        
    } catch (e: Exception) {
        println("Error reading EPUB: ${e.message}")
        e.printStackTrace()
    }
}

fun printToc(references: List<nl.siegmann.epublib.domain.TOCReference>, indent: String) {
    for (ref in references) {
        println("$indent- ${ref.title} (${ref.resource?.href ?: "no resource"})")
        if (ref.children.isNotEmpty()) {
            printToc(ref.children, "$indent  ")
        }
    }
}
