package org.gotson.komga.domain.model

import java.io.Serializable

data class EpubTocEntry(
  val title: String,
  val href: String?,
  val children: List<EpubTocEntry> = emptyList(),
) : Serializable {
  companion object {
    private const val serialVersionUID = 1L
  }
}
