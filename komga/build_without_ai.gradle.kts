// Temporary build file with AI dependencies commented out

// Comment out the AI dependencies in the dependencies block
// implementation("ai.djl.huggingface:tokenizers:0.28.0")
// implementation("ai.djl.huggingface:transformers:0.28.0")
// implementation("com.pinecone:pinecone-client:0.1.0")
// implementation("org.chromadb:chromadb-client:0.4.0")

// Add this to your repositories block in the main build.gradle.kts
// repositories {
//   mavenCentral()
//   maven { url = uri("https://jitpack.io") }
//   maven { url = uri("https://s01.oss.sonatype.org/content/repositories/snapshots/") }
//   maven { url = uri("https://oss.sonatype.org/content/repositories/snapshots/") }
//   // Alternative DJL repository
//   maven { url = uri("https://oss.sonatype.org/content/repositories/snapshots/") }
//   // Pinecone repository if needed
//   maven { url = uri("https://repo1.maven.org/maven2/") }
// }

// To use this file, create a new build script that applies this file instead of the original build.gradle.kts
// Or temporarily replace the contents of build.gradle.kts with this file's contents
