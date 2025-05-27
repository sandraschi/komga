package org.gotson.komga.domain.model

import java.io.Serializable

data class Dimension(
  val width: Int,
  val height: Int,
) : Serializable {
  companion object {
    private const val serialVersionUID = 1L
  }
}
