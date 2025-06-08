package org.gotson.komga

import org.gotson.komga.infrastructure.configuration.OmnibusConfiguration
import org.gotson.komga.infrastructure.util.checkTempDirectory
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Import
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@Import(OmnibusConfiguration::class)
class Application

fun main(args: Array<String>) {
  checkTempDirectory()

  System.setProperty("org.jooq.no-logo", "true")
  System.setProperty("org.jooq.no-tips", "true")

  runApplication<Application>(*args)
}
