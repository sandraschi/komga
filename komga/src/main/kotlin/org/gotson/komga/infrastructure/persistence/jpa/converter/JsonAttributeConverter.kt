package org.gotson.komga.infrastructure.persistence.jpa.converter

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

/**
 * A generic JPA attribute converter that converts between Kotlin objects and JSON strings.
 *
 * @param T The type of the object to be converted
 */
@Converter
class JsonAttributeConverter<T : Any> : AttributeConverter<T, String> {
  private val objectMapper: ObjectMapper =
    jacksonObjectMapper()
      .registerModule(JavaTimeModule())
      .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

  /**
   * Converts the given entity attribute value to its database column representation.
   *
   * @param attribute The entity attribute value to be converted
   * @return The database column representation of the attribute
   */
  override fun convertToDatabaseColumn(attribute: T?): String =
    if (attribute == null) {
      "{}"
    } else {
      objectMapper.writeValueAsString(attribute)
    }

  /**
   * Converts the given database column value to its entity attribute representation.
   *
   * @param dbData The database column value to be converted
   * @return The entity attribute representation of the column value
   */
  @Suppress("UNCHECKED_CAST")
  override fun convertToEntityAttribute(dbData: String?): T? =
    if (dbData.isNullOrBlank()) {
      null
    } else {
      try {
        objectMapper.readValue(dbData, Any::class.java) as T
      } catch (e: Exception) {
        throw IllegalStateException("Error converting JSON to object", e)
      }
    }
}
