package org.gotson.komga.interfaces.api.rest

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.gotson.komga.domain.model.KomgaUser
import org.gotson.komga.infrastructure.llm.rag.RagService
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.interfaces.api.rest.dto.RagDocumentDto
import org.gotson.komga.interfaces.api.rest.dto.RagQueryDto
import org.gotson.komga.interfaces.api.rest.dto.RagResponseDto
import org.gotson.komga.interfaces.api.rest.dto.RagSearchResultDto
import org.gotson.komga.interfaces.api.rest.mapper.RagMapper
import org.gotson.komga.interfaces.api.rest.mapper.toDto
import org.gotson.komga.interfaces.api.rest.mapper.toModel
import org.gotson.komga.interfaces.api.rest.mapper.toSearchResultDto
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/v1/rag", produces = [MediaType.APPLICATION_JSON_VALUE])
@Tag(name = "RAG", description = "Retrieval-Augmented Generation API")
class RagController(
    private val ragService: RagService,
    private val ragMapper: RagMapper
) {

    @PostMapping("/query")
    @Operation(summary = "Query the RAG system")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
    suspend fun query(
        @AuthenticationPrincipal user: KomgaUser,
        @Valid @RequestBody query: RagQueryDto
    ): RagResponseDto {
        val results = ragService.retrieve(
            query = query.query,
            k = query.topK ?: 5,
            filter = query.filters
        )
        
        return RagResponseDto(
            results = results.map { it.toSearchResultDto() },
            answer = if (query.generateAnswer) {
                ragService.generateResponse(
                    query = query.query,
                    context = results.joinToString("\n") { it.chunk.content },
                    maxTokens = query.maxTokens ?: 1000,
                    temperature = query.temperature ?: 0.7
                )
            } else null
        )
    }

    @PostMapping("/documents")
    @Operation(summary = "Add documents to the RAG system")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
    suspend fun addDocuments(
        @AuthenticationPrincipal user: KomgaUser,
        @Valid @RequestBody documents: List<@NotBlank String>,
        @RequestParam(required = false) metadata: Map<String, Any>?
    ): List<String> {
        return ragService.addDocuments(documents, metadata ?: emptyMap())
    }

    @DeleteMapping("/documents/{documentId}")
    @Operation(summary = "Remove a document from the RAG system")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
    suspend fun removeDocument(
        @AuthenticationPrincipal user: KomgaUser,
        @PathVariable documentId: String
    ) {
        ragService.removeDocuments(listOf(documentId))
    }

    @DeleteMapping("/documents")
    @Operation(summary = "Remove multiple documents from the RAG system")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
    suspend fun removeDocuments(
        @AuthenticationPrincipal user: KomgaUser,
        @RequestBody documentIds: List<String>
    ) {
        ragService.removeDocuments(documentIds)
    }
    
    companion object {
        private val objectMapper = jacksonObjectMapper()
    }
}
