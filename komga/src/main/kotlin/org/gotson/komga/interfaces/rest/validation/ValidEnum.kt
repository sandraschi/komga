package org.gotson.komga.interfaces.rest.validation

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

@Target(AnnotationTarget.FIELD, AnnotationTarget.FUNCTION, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
@Constraint(validatedBy = [ValidEnumValidator::class])
annotation class ValidEnum(
  val enumClass: KClass<out Enum<*>>,
  val message: String = "must be any of {enumClass.simpleName}.{values}",
  val groups: Array<KClass<*>> = [],
  val payload: Array<KClass<out Payload>> = [],
)

class ValidEnumValidator : ConstraintValidator<ValidEnum, String> {
  private lateinit var enumValues: Array<out Enum<*>>
  private var messageTemplate: String = ""

  override fun initialize(annotation: ValidEnum) {
    enumValues = annotation.enumClass.java.enumConstants
    messageTemplate = annotation.message
  }

  override fun isValid(
    value: String?,
    context: ConstraintValidatorContext,
  ): Boolean {
    if (value.isNullOrBlank()) return true

    return enumValues.any { it.name == value } ||
      run {
        context.disableDefaultConstraintViolation()
        context
          .buildConstraintViolationWithTemplate(
            messageTemplate.replace(
              "{values}",
              enumValues.joinToString(", ") { it.name },
            ),
          ).addConstraintViolation()
        false
      }
  }
}
