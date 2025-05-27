package org.gotson.komga.interfaces.rest.dto

import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.model.meta.MetaBookSection
import java.net.URI
import java.time.Instant

data class MetaBookDto(
    val id: String,
    val bookIds: List<String>,
    val type: String,
    val status: String,
    val format: String,
    val progress: Float,
    val downloadUrl: URI?,
    val error: String?,
    val metadata: MetaBookMetadataDto?,
    val createdAt: Instant,
    val updatedAt: Instant,
    val completedAt: Instant?,
    val options: GenerationOptionsDto
) {
    data class MetaBookMetadataDto(
        val title: String,
        val description: String,
        val coverImage: URI?,
        val wordCount: Int,
        val sectionCount: Int,
        val generatedAt: Instant
    )
    
    data class GenerationOptionsDto(
        val depth: String,
        val includeSpoilers: Boolean,
        val sections: Set<String>,
        val language: String,
        val theme: String?,
        val style: String
    )
    
    companion object {
        fun MetaBook.toDto(downloadBaseUrl: String = "/api/v1/meta/books"): MetaBookDto =
            MetaBookDto(
                id = id,
                bookIds = bookIds,
                type = type.name,
                status = status.name,
                format = format.name,
                progress = progress,
                downloadUrl = if (storagePath != null) URI.create("$downloadBaseUrl/$id/download") else null,
                error = error,
                metadata = metadata?.let { meta ->
                    MetaBookMetadataDto(
                        title = meta.title,
                        description = meta.description,
                        coverImage = meta.coverImage?.let { URI.create(it) },
                        wordCount = meta.wordCount,
                        sectionCount = meta.sectionCount,
                        generatedAt = meta.generatedAt
                    )
                },
                createdAt = createdAt,
                updatedAt = updatedAt,
                completedAt = completedAt,
                options = GenerationOptionsDto(
                    depth = options.depth.name,
                    includeSpoilers = options.includeSpoilers,
                    sections = options.sections.map { it.name }.toSet(),
                    language = options.language,
                    theme = options.theme,
                    style = options.style.name
                )
            )
    }
}

data class MetaBookSectionDto(
    val id: String,
    val sectionType: String,
    val title: String,
    val content: String,
    val order: Int,
    val metadata: Map<String, Any>
) {
    companion object {
        fun MetaBookSection.toDto(): MetaBookSectionDto =
            MetaBookSectionDto(
                id = id,
                sectionType = sectionType,
                title = title,
                content = content,
                order = order,
                metadata = metadata
            )
    }
}
