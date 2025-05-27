# Debugging and Testing Guide for Komga Development

## Table of Contents
1. [Quick Start](#quick-start)
2. [Building and Testing](#building-and-testing)
3. [Running the Application](#running-the-application)
4. [Debugging Techniques](#debugging-techniques)
5. [Testing Strategies](#testing-strategies)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [Performance Profiling](#performance-profiling)
8. [Useful Commands Cheatsheet](#useful-commands-cheatsheet)

## Quick Start

### Prerequisites
- Java 17 JDK
- Gradle 7.6+
- Git
- (Optional) IntelliJ IDEA or VS Code with Kotlin plugin

### First-Time Setup
```bash
# Clone the repository
gh repo clone gotson/komga
cd komga

# Build the project
./gradlew build

# Run the application
./gradlew bootRun
```

## Building and Testing

### Clean Build
```bash
# Clean and build everything
./gradlew clean build

# Build without tests
./gradlew build -x test

# Build with detailed output
./gradlew build --info
```

### Running Tests
```bash
# Run all tests
./gradlew test

# Run a specific test class
./gradlew test --tests "org.gotson.komga.infrastructure.epub.omnibus.EpubTocParserTest"

# Run a single test method
./gradlew test --tests "org.gotson.komga.infrastructure.epub.omnibus.EpubTocParserTest.should detect shakespeare works"

# Run with test logging
./gradlew test --tests "*" --info

# Run with debug logging
GRADLE_OPTS="-Dorg.gradle.debug=true" ./gradlew test --debug-jvm
```

### Test Coverage
```bash
# Generate test coverage report
./gradlew jacocoTestReport
# Report will be available at: build/reports/jacoco/test/html/index.html
```

## Running the Application

### Development Mode
```bash
# Run with development profile
./gradlew bootRun --args='--spring.profiles.active=dev'

# Run on a different port
./gradlew bootRun --args='--server.port=3000'

# Enable debug logging
./gradlew bootRun --args='--debug --logging.level.org.gotson.komga=DEBUG'
```

### Running Multiple Instances

You can run multiple instances simultaneously for testing different versions or configurations:

```bash
# First instance (default port 25600)
./gradlew bootRun --args='--server.port=25600 --komga.database.file=./data/komga1 --komga.libraries.root-directory=./libraries1'

# Second instance (different port and directories)
./gradlew bootRun --args='--server.port=25601 --komga.database.file=./data/komga2 --komga.libraries.root-directory=./libraries2'
```

**Important Notes:**
- Each instance must have its own database directory to prevent corruption
- Use different library directories to avoid conflicts
- Each instance needs its own port for the web interface
- Monitor system resources when running multiple instances

### Production Mode
```bash
# Build the JAR
./gradlew bootJar

# Run the JAR with custom configuration
java -jar komga/build/libs/komga-*.jar \
  --server.port=3000 \
  --komga.database.file=./data/komga \
  --komga.libraries.root-directory=./libraries \
  --spring.config.location=classpath:application.yml,file:./config/
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t komga .

# Run a single instance
docker run -d \
  --name komga \
  -p 25600:25600 \
  -v $(pwd)/config:/config \
  -v $(pwd)/libraries:/libraries \
  --restart unless-stopped \
  komga

# Docker Compose example (docker-compose.yml)
version: '3.3'
services:
  komga:
    image: gotson/komga
    container_name: komga
    ports:
      - '25600:25600'
    volumes:
      - './config:/config'
      - './libraries:/libraries'
    restart: unless-stopped
```

### Remote Access with Tailscale

Tailscale provides a simple, secure way to access your Komga instance remotely without complex network configuration or exposing ports to the internet.

### Setup Tailscale

1. **Install Tailscale** on your server:
   ```bash
   # Linux
   curl -fsSL https://tailscale.com/install.sh | sh
   
   # Windows (PowerShell as Admin)
   winget install Tailscale.Tailscale
   ```

2. **Start Tailscale** and authenticate:
   ```bash
   sudo tailscale up
   ```
   Follow the authentication link in your terminal.

### Accessing Komga Securely

1. **Find your Tailscale IP**:
   ```bash
   tailscale ip
   # Example output: 100.x.y.z
   ```

2. **Run Komga** bound to the Tailscale IP:
   ```bash
   ./gradlew bootRun --args='--server.address=100.x.y.z --server.port=25600'
   ```
   
   Or in `application.yml`:
   ```yaml
   server:
     address: 100.x.y.z
     port: 25600
   ```

3. **Access from any device** with Tailscale installed:
   ```
   http://100.x.y.z:25600
   ```

### Advanced Configuration

#### Subnet Routing (for local network access)
```bash
# On the server
sudo tailscale up --advertise-routes=192.168.1.0/24 --accept-routes

# On admin console (admin.tailscale.com)
# Enable subnet routing for the node
```

#### Tailscale ACLs (Access Control)
Create a Tailscale ACL policy file (`tailscale-policy.json`):
```json
{
  "acls": [
    {
      "action": "accept",
      "users": ["your@email.com"],
      "ports": [
        "100.x.y.z:25600"
      ]
    }
  ]
}
```

#### Using Tailscale Funnel (HTTPS)
1. Enable HTTPS in Komga:
   ```yaml
   server:
     ssl:
       enabled: true
       key-store: classpath:keystore.p12
       key-store-password: yourpassword
   ```

2. Enable Tailscale Funnel:
   ```bash
   sudo tailscale serve https / http://localhost:25600
   sudo tailscale funnel 443 on
   ```

### Benefits
- **No port forwarding** required
- **End-to-end encryption** with WireGuard
- **No dynamic DNS** needed
- **Access control** per user/device
- **Works behind NAT/firewalls**

## Cloud Deployment

#### AWS Elastic Beanstalk
1. Package your application:
   ```bash
   ./gradlew bootJar
   ```

2. Create `Dockerrun.aws.json`:
   ```json
   {
     "AWSEBDockerrunVersion": "1",
     "Image": {
       "Name": "gotson/komga:latest"
     },
     "Ports": [
       {
         "ContainerPort": "25600"
       }
     ]
   }
   ```

3. Deploy using EB CLI:
   ```bash
   eb init -p docker komga-app
   eb create komga-prod
   ```

#### Google Cloud Run
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/your-project/komga

# Deploy to Cloud Run
gcloud run deploy komga \
  --image gcr.io/your-project/komga \
  --platform managed \
  --port 25600 \
  --set-env-vars=KOMGA_DATABASE_FILE=/data/komga.sqlite \
  --volume-name=komga-data \
  --mount-path=/data
```

### Windows Service (Using NSSM)

1. Install NSSM: https://nssm.cc/
2. Create a service:
   ```cmd
   nssm install Komga
   nssm set Komga Application java -jar "C:\path\to\komga.jar"
   nssm set Komga AppDirectory "C:\path\to\komga"
   nssm set Komga AppParameters --server.port=25600 --komga.database.file=./data/komga.sqlite
   nssm start Komga
   ```

### Systemd Service (Linux)

Create `/etc/systemd/system/komga.service`:
```ini
[Unit]
Description=Komga
After=network.target

[Service]
User=komga
WorkingDirectory=/opt/komga
ExecStart=/usr/bin/java -jar /opt/komga/komga.jar
SuccessExitStatus=143
TimeoutStopSec=10
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable komga
sudo systemctl start komga
```

## Debugging Techniques

### IDE Debugging
1. **IntelliJ IDEA**
   - Click the debug icon next to `bootRun` in Gradle tool window
   - Or create a new "Gradle" run configuration with task `bootRun`

2. **VS Code**
   - Install "Kotlin" and "Debugger for Java" extensions
   - Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "java",
         "name": "Debug (Attach)",
         "request": "attach",
         "hostName": "localhost",
         "port": 5005
       }
     ]
   }
   ```

### Remote Debugging
1. Start the application in debug mode:
   ```bash
   ./gradlew bootRun --debug-jvm
   # Or for custom debug port:
   # ./gradlew bootRun -Ddebug.port=5006
   ```

2. Attach your IDE's debugger to port 5005

### Logging
1. Enable debug logging in `application.yml`:
   ```yaml
   logging:
     level:
       org.gotson.komga: DEBUG
       org.springframework: INFO
   ```

2. Or via command line:
   ```bash
   ./gradlew bootRun --args='--logging.level.org.gotson.komga=DEBUG'
   ```

## Testing Strategies

### Unit Tests
- Test individual components in isolation
- Use MockK for mocking
- Keep tests fast and focused

### Integration Tests
- Test component interactions
- Use `@SpringBootTest` for Spring integration tests
- Consider using testcontainers for database tests

### API Testing
- Use `@WebMvcTest` for controller tests
- Test JSON serialization/deserialization
- Verify HTTP status codes and response bodies

### Test Data Management
- Use `@Sql` for database setup
- Consider using test fixtures
- Use random test data generation (e.g., KotlinFixture)

## Troubleshooting Common Issues

### Build Issues
```bash
# Clean build
./gradlew clean build --refresh-dependencies

# Stop Gradle daemons
./gradlew --stop

# Delete Gradle caches
rm -rf ~/.gradle/caches/
```

### Database Issues
```bash
# Reset the database (deletes all data!)
rm -rf ./data/komga/

# Enable SQL logging
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

### Memory Issues
```bash
# Increase heap size
./gradlew bootRun -Dorg.gradle.jvmargs="-Xmx2g"

# Enable GC logging
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log
```

## Performance Profiling

### JVM Profiling
```bash
# Enable flight recorder
./gradlew bootRun -Dspring.profiles.active=dev \
  -XX:+FlightRecorder -XX:StartFlightRecording=duration=60s,filename=profile.jfr

# Analyze with Java Mission Control
jdk.jfr.open profile.jfr
```

### Memory Analysis
```bash
# Generate heap dump on OutOfMemoryError
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./heap-dump.hprof

# Analyze with Eclipse MAT or VisualVM
```

## Useful Commands Cheatsheet

### Gradle
```bash
# List all tasks
./gradlew tasks

# List all dependencies
./gradlew dependencies

# Check for dependency updates
./gradlew dependencyUpdates

# Run with parallel builds
./gradlew build --parallel
```

### Git
```bash
# See changes
git diff

# See file history
git log --follow -p -- path/to/file.kt

# Interactive rebase
git rebase -i HEAD~5
```

### System
```bash
# Find Java processes
jps -l

# Show JVM flags
jcmd <pid> VM.flags

# Take thread dump
jstack <pid> > threaddump.txt
```

## Additional Resources
- [Kotlin Testing Guide](https://kotlinlang.org/docs/testing.html)
- [Spring Boot Testing](https://spring.io/guides/gs/testing-web/)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [MockK Documentation](https://mockk.io/)
