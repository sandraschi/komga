package org.gotson.komga.interfaces.rest

import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.doThrow
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.gotson.komga.application.task.OmnibusProcessingTask
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import java.util.concurrent.CompletableFuture

@ExtendWith(MockitoExtension::class)
class OmnibusTaskControllerTest {

    @Mock
    private lateinit var omnibusProcessingTask: OmnibusProcessingTask
    
    @InjectMocks
    private lateinit var controller: OmnibusTaskController
    
    @Test
    fun `processAllBooks should return accepted response`() = runBlocking {
        // Given - Mock the processing to complete successfully
        whenever(omnibusProcessingTask.processAllBooks()).thenReturn(CompletableFuture.completedFuture(Unit))
        
        // When
        val response = controller.processAllBooks()
        
        // Then
        assertThat(response.statusCode).isEqualTo(HttpStatus.ACCEPTED)
        assertThat(response.body).isNotNull
        assertThat(response.body!!["status"]).isEqualTo("accepted")
        assertThat(response.body!!["message"]).isEqualTo("Omnibus detection task started. Check server logs for progress.")
        
        // Verify the task was started
        verify(omnibusProcessingTask).processAllBooks()
    }
    
    @Test
    fun `processAllBooks should handle errors gracefully`() = runBlocking {
        // Given - Mock the processing to fail
        val error = RuntimeException("Processing failed")
        whenever(omnibusProcessingTask.processAllBooks()).thenThrow(error)
        
        // When
        val response = controller.processAllBooks()
        
        // Then
        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        assertThat(response.body).isNotNull
        assertThat(response.body!!["status"]).isEqualTo("error")
        assertThat(response.body!!["message"]).contains("Failed to start omnibus detection task")
        
        // Verify the task was attempted
        verify(omnibusProcessingTask).processAllBooks()
    }
}
