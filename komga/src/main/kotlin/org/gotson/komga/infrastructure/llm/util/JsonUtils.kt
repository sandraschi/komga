package org.gotson.komga.infrastructure.llm.util

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import mu.KotlinLogging
import java.io.IOException

private val logger = KotlinLogging.logger {}

/**
 * Utility class for JSON operations.
 */
object JsonUtils {
    private val objectMapper = jacksonObjectMapper()
    
    /**
     * Converts an object to a JSON string.
     *
     * @param obj The object to convert
     * @return The JSON string representation of the object
     * @throws JsonProcessingException if the object cannot be converted to JSON
     */
    @Throws(JsonProcessingException::class)
    fun toJson(obj: Any): String {
        return objectMapper.writeValueAsString(obj)
    }
    
    /**
     * Converts a JSON string to an object of the specified type.
     *
     * @param json The JSON string to convert
     * @param clazz The class of the target type
     * @return The deserialized object
     * @throws IOException if the JSON string cannot be deserialized
     */
    @Throws(IOException::class)
    fun <T> fromJson(json: String, clazz: Class<T>): T {
        return objectMapper.readValue(json, clazz)
    }
    
    /**
     * Converts a JSON string to an object of the specified type reference.
     * Useful for generic types.
     *
     * @param json The JSON string to convert
     * @param typeReference The type reference of the target type
     * @return The deserialized object
     * @throws IOException if the JSON string cannot be deserialized
     */
    @Throws(IOException::class)
    fun <T> fromJson(json: String, typeReference: TypeReference<T>): T {
        return objectMapper.readValue(json, typeReference)
    }
    
    /**
     * Converts a JSON string to a JsonNode.
     *
     * @param json The JSON string to convert
     * @return The JsonNode representation of the JSON string
     * @throws IOException if the JSON string cannot be parsed
     */
    @Throws(IOException::class)
    fun toJsonNode(json: String): JsonNode {
        return objectMapper.readTree(json)
    }
    
    /**
     * Converts an object to a JsonNode.
     *
     * @param obj The object to convert
     * @return The JsonNode representation of the object
     */
    fun toJsonNode(obj: Any): JsonNode {
        return objectMapper.valueToTree(obj)
    }
    
    /**
     * Converts a JsonNode to an object of the specified type.
     *
     * @param node The JsonNode to convert
     * @param clazz The class of the target type
     * @return The deserialized object
     * @throws JsonProcessingException if the JsonNode cannot be deserialized
     */
    @Throws(JsonProcessingException::class)
    fun <T> fromJsonNode(node: JsonNode, clazz: Class<T>): T {
        return objectMapper.treeToValue(node, clazz)
    }
    
    /**
     * Creates a new empty ObjectNode.
     *
     * @return A new empty ObjectNode
     */
    fun createObjectNode(): ObjectNode {
        return objectMapper.createObjectNode()
    }
    
    /**
     * Creates a new empty ArrayNode.
     *
     * @return A new empty ArrayNode
     */
    fun createArrayNode(): ArrayNode {
        return objectMapper.createArrayNode()
    }
    
    /**
     * Pretty-prints a JSON string.
     *
     * @param json The JSON string to format
     * @return The pretty-printed JSON string
     * @throws IOException if the JSON string cannot be parsed
     */
    @Throws(IOException::class)
    fun prettyPrint(json: String): String {
        val jsonNode = toJsonNode(json)
        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode)
    }
    
    /**
     * Merges two JSON objects. The second object's properties will overwrite the first object's properties.
     *
     * @param target The target JSON object
     * @param source The source JSON object
     * @return The merged JSON object
     */
    fun merge(target: JsonNode, source: JsonNode): JsonNode {
        return when {
            target.isObject && source.isObject -> {
                val merged = target.deepCopy<ObjectNode>()
                source.fields().forEach { (key, value) ->
                    merged.replace(key, merge(merged.get(key) ?: objectMapper.nullNode(), value))
                }
                merged
            }
            target.isArray && source.isArray -> {
                val merged = target.deepCopy<ArrayNode>()
                source.elements().forEach { merged.add(it) }
                merged
            }
            else -> source
        }
    }
    
    /**
     * Safely parses a JSON string, returning null if parsing fails.
     *
     * @param json The JSON string to parse
     * @param clazz The class of the target type
     * @return The deserialized object, or null if parsing fails
     */
    fun <T> safeFromJson(json: String?, clazz: Class<T>): T? {
        if (json.isNullOrBlank()) {
            return null
        }
        
        return try {
            fromJson(json, clazz)
        } catch (e: Exception) {
            logger.error(e) { "Failed to parse JSON to ${clazz.simpleName}" }
            null
        }
    }
    
    /**
     * Safely converts an object to a JSON string, returning null if conversion fails.
     *
     * @param obj The object to convert
     * @return The JSON string, or null if conversion fails
     */
    fun safeToJson(obj: Any?): String? {
        if (obj == null) {
            return null
        }
        
        return try {
            toJson(obj)
        } catch (e: Exception) {
            logger.error(e) { "Failed to convert object to JSON: ${obj::class.simpleName}" }
            null
        }
    }
}
