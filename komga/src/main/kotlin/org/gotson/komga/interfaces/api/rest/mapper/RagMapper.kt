package org.gotson.komga.interfaces.api.rest.mapper

import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagSearchResult
import org.gotson.komga.interfaces.api.rest.dto.DocumentChunkDto
import org.gotson.komga.interfaces.api.rest.dto.RagDocumentDto
import org.gotson.komga.interfaces.api.rest.dto.RagSearchResultDto
import org.mapstruct.Mapper
import org.mapstruct.Mapping
import org.mapstruct.factory.Mappers

/**
 * Mapper for RAG-related DTOs
 */
@Mapper
interface RagMapper {
  companion object {
    val INSTANCE: RagMapper = Mappers.getMapper(RagMapper::class.java)
  }

  @Mapping(target = "chunks", ignore = true)
  fun toDto(document: RagDocument): RagDocumentDto

  fun toDto(chunk: DocumentChunk): DocumentChunkDto

  fun toSearchResultDto(result: RagSearchResult): RagSearchResultDto

  fun toModel(dto: RagDocumentDto): RagDocument

  fun toModel(dto: DocumentChunkDto): DocumentChunk
}

/**
 * Extension functions for mapping to DTOs
 */
fun RagDocument.toDto(): RagDocumentDto =
  RagMapper.INSTANCE.toDto(this).copy(
    chunks = this.chunks.map { it.toDto() },
  )

fun DocumentChunk.toDto(): DocumentChunkDto = RagMapper.INSTANCE.toDto(this)

fun RagSearchResult.toSearchResultDto(): RagSearchResultDto = RagMapper.INSTANCE.toSearchResultDto(this)
