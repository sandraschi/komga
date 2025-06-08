package org.gotson.komga.domain.model

import java.io.Serializable

class Author(
  name: String,
  role: String,
) : Serializable {
  companion object {
    private const val serialVersionUID = 1L
  }

  val name = name.trim()
  val role = role.trim().lowercase()

  override fun toString(): String = "Author($name, $role)"

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other !is Author) return false

    if (name != other.name) return false
    if (role != other.role) return false

    return true
  }

  override fun hashCode(): Int {
    var result = name.hashCode()
    result = 31 * result + role.hashCode()
    return result
  }
}
