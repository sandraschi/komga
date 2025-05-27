package org.gotson.komga.infrastructure.validation

import jakarta.validation.Validation
import jakarta.validation.Validator
import org.gotson.komga.domain.model.VirtualBook
import org.springframework.stereotype.Component

/**
 * Validates domain entities using Bean Validation (JSR 380).
 */
@Component
class LocalEntityValidator {
    private val validator: Validator = Validation.buildDefaultValidatorFactory().validator

    /**
     * Validates a single entity.
     * @throws jakarta.validation.ConstraintViolationException if validation fails
     */
    fun <T> validate(entity: T) {
        val violations = validator.validate(entity)
        if (violations.isNotEmpty()) {
            throw jakarta.validation.ConstraintViolationException(violations)
        }
    }

    /**
     * Validates a collection of entities.
     * @throws jakarta.validation.ConstraintViolationException if validation fails for any entity
     */
    fun <T> validate(entities: Collection<T>) {
        entities.forEach { validate(it) }
    }

    /**
     * Validates a virtual book, including any custom validation rules.
     */
    fun validateVirtualBook(book: VirtualBook) {
        validate(book)
        // Add any custom validation rules for VirtualBook here
    }
}
