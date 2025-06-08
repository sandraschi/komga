package org.gotson.komga.infrastructure.llm.util

import mu.KotlinLogging
import org.springframework.core.env.Environment
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.text.Charsets.UTF_8

private val logger = KotlinLogging.logger {}

/**
 * Utility class for handling API keys and other sensitive data.
 */
object SecurityUtils {
  private const val ALGORITHM = "AES"
  private const val TRANSFORMATION = "AES/CBC/PKCS5Padding"
  private const val KEY_SIZE = 256

  private lateinit var secretKey: SecretKey
  private lateinit var iv: ByteArray

  /**
   * Initializes the security utilities with a secret key.
   * If no key is provided, a new one will be generated.
   *
   * @param environment The Spring environment
   * @param propertyName The name of the property containing the secret key (base64-encoded)
   */
  @Synchronized
  fun initialize(
    environment: Environment,
    propertyName: String = "komga.llm.encryption.key",
  ) {
    if (this::secretKey.isInitialized) {
      return
    }

    val keyString = environment.getProperty(propertyName)

    if (keyString.isNullOrBlank()) {
      logger.warn { "No encryption key found in configuration. A new key will be generated." }
      val keyGen = KeyGenerator.getInstance(ALGORITHM)
      keyGen.init(KEY_SIZE)
      secretKey = keyGen.generateKey()

      // Generate a random IV
      iv = ByteArray(16)
      Random().nextBytes(iv)

      logger.info { "Generated new encryption key. Please add the following to your configuration:" }
      logger.info { "$propertyName=${Base64.getEncoder().encodeToString(secretKey.encoded)},${Base64.getEncoder().encodeToString(iv)}" }
    } else {
      val parts = keyString.split(",")
      if (parts.size != 2) {
        throw IllegalArgumentException("Invalid encryption key format. Expected format: <key>,<iv>")
      }

      val keyBytes = Base64.getDecoder().decode(parts[0].trim())
      secretKey = SecretKeySpec(keyBytes, ALGORITHM)
      iv = Base64.getDecoder().decode(parts[1].trim())

      logger.debug { "Initialized encryption with provided key" }
    }
  }

  /**
   * Encrypts a string.
   *
   * @param input The string to encrypt
   * @return The encrypted string (base64-encoded)
   */
  @Synchronized
  fun encrypt(input: String): String {
    require(this::secretKey.isInitialized) { "SecurityUtils has not been initialized" }

    return try {
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.ENCRYPT_MODE, secretKey, IvParameterSpec(iv))
      val encrypted = cipher.doFinal(input.toByteArray(UTF_8))
      Base64.getEncoder().encodeToString(encrypted)
    } catch (e: Exception) {
      logger.error(e) { "Error encrypting data" }
      throw RuntimeException("Failed to encrypt data", e)
    }
  }

  /**
   * Decrypts a string.
   *
   * @param input The encrypted string (base64-encoded)
   * @return The decrypted string
   */
  @Synchronized
  fun decrypt(input: String): String {
    require(this::secretKey.isInitialized) { "SecurityUtils has not been initialized" }

    return try {
      val encrypted = Base64.getDecoder().decode(input)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, secretKey, IvParameterSpec(iv))
      String(cipher.doFinal(encrypted), UTF_8)
    } catch (e: Exception) {
      logger.error(e) { "Error decrypting data" }
      throw RuntimeException("Failed to decrypt data", e)
    }
  }

  /**
   * Masks a sensitive string for logging.
   *
   * @param input The string to mask
   * @param showFirst Number of characters to show at the start
   * @param showLast Number of characters to show at the end
   * @param maskChar The character to use for masking
   * @return The masked string
   */
  fun maskSensitiveString(
    input: String?,
    showFirst: Int = 4,
    showLast: Int = 4,
    maskChar: Char = '*',
  ): String {
    if (input.isNullOrBlank()) {
      return ""
    }

    return if (input.length <= showFirst + showLast) {
      "*".repeat(input.length)
    } else {
      input.take(showFirst) + maskChar.toString().repeat(8) + input.takeLast(showLast)
    }
  }

  /**
   * Validates an API key.
   *
   * @param apiKey The API key to validate
   * @return `true` if the API key is valid, `false` otherwise
   */
  fun isValidApiKey(apiKey: String?): Boolean {
    if (apiKey.isNullOrBlank()) {
      return false
    }

    // Basic validation - adjust according to your requirements
    return apiKey.length >= 16
  }

  /**
   * Generates a random API key.
   *
   * @param length The length of the key to generate
   * @return A random API key
   */
  fun generateApiKey(length: Int = 32): String {
    val allowedChars = ('A'..'Z') + ('a'..'z') + ('0'..'9') + "-_".toList()
    return (1..length)
      .map { allowedChars.random() }
      .joinToString("")
  }
}
