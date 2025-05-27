plugins {
  kotlin("jvm") version "1.6.21"
  id("application")
}

repositories {
  mavenCentral()
}

dependencies {
  implementation("org.jetbrains.kotlin:kotlin-stdlib")
  implementation("com.github.psiegman:epublib-core:3.1")
  implementation("org.slf4j:slf4j-simple:1.7.36") // For logging
}

application {
  mainClass.set("AnalyzeEpubKt")
}
