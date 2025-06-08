package org.gotson.komga.infrastructure.storage

import mu.KotlinLogging
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.stereotype.Component
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.attribute.BasicFileAttributes

private val logger = KotlinLogging.logger {}

@Component
class StorageManager(
  private val properties: StorageProperties,
) {
  private val baseDir: Path by lazy {
    val dir = Paths.get(properties.metaBooksDir).toAbsolutePath()
    Files.createDirectories(dir)
    dir
  }

  suspend fun storeMetaBook(
    content: ByteArray,
    fileName: String,
    metaBookId: String,
  ): Path {
    val metaBookDir = getMetaBookDirectory(metaBookId)
    val filePath = metaBookDir.resolve(fileName)

    try {
      Files.write(filePath, content, StandardOpenOption.CREATE_NEW)
      logger.debug { "Stored meta book file: $filePath" }
      return filePath
    } catch (e: FileAlreadyExistsException) {
      logger.warn { "Meta book file already exists: $filePath" }
      throw StorageException("Meta book file already exists: $fileName", e)
    } catch (e: IOException) {
      logger.error(e) { "Failed to store meta book file: $filePath" }
      throw StorageException("Failed to store meta book file: $fileName", e)
    }
  }

  fun getMetaBookContent(
    metaBookId: String,
    fileName: String,
  ): ByteArray? {
    val filePath = getMetaBookDirectory(metaBookId).resolve(fileName)
    return if (Files.exists(filePath)) {
      Files.readAllBytes(filePath)
    } else {
      null
    }
  }

  fun deleteMetaBook(metaBookId: String) {
    try {
      val metaBookDir = getMetaBookDirectory(metaBookId)
      if (Files.exists(metaBookDir)) {
        Files.walkFileTree(
          metaBookDir,
          object : SimpleFileVisitor<Path>() {
            override fun visitFile(
              file: Path,
              attrs: BasicFileAttributes,
            ): FileVisitResult {
              Files.delete(file)
              return FileVisitResult.CONTINUE
            }

            override fun postVisitDirectory(
              dir: Path,
              exc: IOException?,
            ): FileVisitResult {
              Files.delete(dir)
              return FileVisitResult.CONTINUE
            }
          },
        )
      }
    } catch (e: IOException) {
      logger.error(e) { "Failed to delete meta book directory for: $metaBookId" }
      throw StorageException("Failed to delete meta book: $metaBookId", e)
    }
  }

  private fun getMetaBookDirectory(metaBookId: String): Path =
    baseDir.resolve(metaBookId).also {
      try {
        Files.createDirectories(it)
      } catch (e: IOException) {
        throw StorageException("Failed to create meta book directory: $metaBookId", e)
      }
    }
}

class StorageException(
  message: String,
  cause: Throwable? = null,
) : RuntimeException(message, cause)

@Configuration
@EnableConfigurationProperties(StorageProperties::class)
class StorageConfig {
  @Bean
  fun storageManager(properties: StorageProperties): StorageManager = StorageManager(properties)
}

@ConfigurationProperties(prefix = "komga.storage")
data class StorageProperties(
  /**
   * Directory where generated meta books will be stored
   */
  val metaBooksDir: String = "data/meta-books",
)
