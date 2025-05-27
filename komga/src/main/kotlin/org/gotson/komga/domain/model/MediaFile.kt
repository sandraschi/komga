package org.gotson.komga.domain.model

import java.io.Serializable

data class MediaFile(
  val fileName: String,
  val mediaType: String? = null,
  val subType: SubType? = null,
  val fileSize: Long? = null,
) : Serializable {
  companion object {
    private const val serialVersionUID = 1L
  }

  enum class SubType {
    EPUB_PAGE,
    EPUB_ASSET,
    ;

    companion object {
      private const val serialVersionUID = 1L
    }
  }
}
