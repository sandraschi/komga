package org.gotson.komga.infrastructure.template

import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.infrastructure.analysis.AnalysisSection
import org.gotson.komga.infrastructure.analysis.BookAnalysis
import org.gotson.komga.infrastructure.job.RenderedContent
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets

@Service
class TemplateService {
    
    fun render(format: MetaBook.OutputFormat, analysis: BookAnalysis): RenderedContent {
        return when (format) {
            MetaBook.OutputFormat.EPUB -> renderEpub(analysis)
            MetaBook.OutputFormat.PDF -> renderPdf(analysis)
            MetaBook.OutputFormat.MARKDOWN -> renderMarkdown(analysis)
            MetaBook.OutputFormat.WEB -> renderWeb(analysis)
        }
    }
    
    private fun renderEpub(analysis: BookAnalysis): RenderedContent {
        // TODO: Implement EPUB generation using a library like EpubCheck
        val content = buildString {
            appendLine("<?xml version='1.0' encoding='utf-8'?>")
            appendLine("<html xmlns='http://www.w3.org/1999/xhtml'>")
            appendLine("<head><title>${analysis.title}</title></head>")
            appendLine("<body>")
            appendLine("<h1>${analysis.title}</h1>")
            analysis.sections.forEach { section ->
                appendLine("<h2>${section.title}</h2>")
                appendLine("<div>${section.content}</div>")
            }
            appendLine("</body>")
            appendLine("</html>")
        }
        
        return RenderedContent(
            content = content.toByteArray(StandardCharsets.UTF_8),
            fileExtension = "epub",
            wordCount = content.split(\s).size
        )
    }
    
    private fun renderPdf(analysis: BookAnalysis): RenderedContent {
        // TODO: Implement PDF generation using a library like iText or Apache PDFBox
        val content = buildString {
            appendLine("${analysis.title}\n${"=".repeat(analysis.title.length)}\n")
            analysis.sections.forEach { section ->
                appendLine("\n${section.title}\n${"-".repeat(section.title.length)}\n")
                appendLine(section.content)
            }
        }
        
        return RenderedContent(
            content = content.toByteArray(StandardCharsets.UTF_8),
            fileExtension = "pdf",
            wordCount = content.split(\s).size
        )
    }
    
    private fun renderMarkdown(analysis: BookAnalysis): RenderedContent {
        val content = buildString {
            appendLine("# ${analysis.title}\n")
            appendLine("${analysis.description}\n")
            
            analysis.sections.forEach { section ->
                appendLine("\n## ${section.title}\n")
                appendLine("${section.content}\n")
            }
        }
        
        return RenderedContent(
            content = content.toByteArray(StandardCharsets.UTF_8),
            fileExtension = "md",
            wordCount = content.split(\s).size
        )
    }
    
    private fun renderWeb(analysis: BookAnalysis): RenderedContent {
        val content = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${analysis.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                    h2 { color: #444; margin-top: 30px; }
                    .section { margin-bottom: 30px; }
                </style>
            </head>
            <body>
                <h1>${analysis.title}</h1>
                <p>${analysis.description}</p>
                
                ${analysis.sections.joinToString("\n") { section ->
                    """
                    <div class="section">
                        <h2>${section.title}</h2>
                        <div>${section.content}</div>
                    </div>
                    """.trimIndent()
                }}
            </body>
            </html>
        """.trimIndent()
        
        return RenderedContent(
            content = content.toByteArray(StandardCharsets.UTF_8),
            fileExtension = "html",
            wordCount = content.split(\s).size
        )
    }
}
