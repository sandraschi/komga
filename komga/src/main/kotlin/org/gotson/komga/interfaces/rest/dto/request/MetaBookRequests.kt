package org.gotson.komga.interfaces.rest.dto.request

import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.interfaces.rest.validation.ValidEnum
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull

data class MetaBookCreateRequest(
    @field:NotEmpty
    val bookIds: List<@NotBlank String>,
    
    @field:NotNull
    val options: GenerationOptionsDto
) {
    data class GenerationOptionsDto(
        @field:ValidEnum(enumClass = MetaBook.OutputFormat::class)
        val format: String,
        
        @field:ValidEnum(enumClass = MetaBook.AnalysisDepth::class)
        val depth: String = "STANDARD",
        
        val includeSpoilers: Boolean = false,
        
        val sections: Set<@ValidEnum(enumClass = MetaBook.AnalysisSection::class) String> = 
            MetaBook.AnalysisSection.values().map { it.name }.toSet(),
            
        val language: String = "en",
        
        val theme: String? = null,
        
        @field:ValidEnum(enumClass = MetaBook.AnalysisStyle::class)
        val style: String = "ANALYTICAL"
    ) {
        fun toDomain(): MetaBook.GenerationOptions =
            MetaBook.GenerationOptions(
                depth = MetaBook.AnalysisDepth.valueOf(depth),
                includeSpoilers = includeSpoilers,
                sections = sections.map { MetaBook.AnalysisSection.valueOf(it) }.toSet(),
                language = language,
                theme = theme,
                style = MetaBook.AnalysisStyle.valueOf(style)
            )
    }
}

data class MetaBookSectionCreateRequest(
    @field:NotBlank
    val sectionType: String,
    
    @field:NotBlank
    val title: String,
    
    val content: String = "",
    
    val order: Int = 0,
    
    val metadata: Map<String, Any> = emptyMap()
) {
    fun toDomain(metaBookId: String): MetaBookSection =
        MetaBookSection(
            metaBookId = metaBookId,
            sectionType = sectionType,
            title = title,
            content = content,
            order = order,
            metadata = metadata
        )
}

data class SectionProgressUpdateRequest(
    val progress: Float
)
