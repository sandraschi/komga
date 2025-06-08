package org.gotson.komga

import org.gotson.komga.infrastructure.configuration.MetaBookFeatureConfiguration
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Import
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties
@Import(MetaBookFeatureConfiguration::class)
class KomgaApplication

fun main(args: Array<String>) {
  runApplication<KomgaApplication>(*args)
}
