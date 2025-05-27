package org.gotson.komga.domain.model

/**
 * Represents the type of omnibus detection.
 */
enum class OmnibusType {
  /** Delphi Classics omnibus edition */
  DELPHI_CLASSICS,

  /** Generic omnibus detection based on title patterns */
  GENERIC_OMNIBUS,

  /** Not an omnibus */
  NONE,
}
