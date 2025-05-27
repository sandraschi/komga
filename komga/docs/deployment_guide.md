# Komga Deployment Guide

## Table of Contents
1. [Recommended Setup](#recommended-setup)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [High Availability](#high-availability)
5. [Performance Tuning](#performance-tuning)
6. [Security Hardening](#security-hardening)
7. [Backup Strategy](#backup-strategy)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Disaster Recovery](#disaster-recovery)
10. [Advanced Networking](#advanced-networking)
11. [Troubleshooting](#troubleshooting)
12. [Appendix: Configuration Reference](#appendix-configuration-reference)

## Recommended Setup

### Development Environment

#### Hardware Requirements
- **Minimum**:
  - CPU: 2 cores
  - RAM: 4GB
  - Storage: 20GB free space (SSD recommended)
  - Network: 100Mbps

#### Software Stack
- **Containerization**:
  - Docker 20.10+ with BuildKit enabled
  - Docker Compose 2.0+
  - Podman (alternative to Docker)

- **Networking**:
  - Tailscale for secure remote access
  - Local DNS resolution (dnsmasq or similar)
  - HTTP/3 enabled browser for testing

- **Development Tools**:
  - IntelliJ IDEA Ultimate (with Kotlin plugin)
  - jq for JSON processing
  - HTTPie for API testing
  - k9s for Kubernetes management

### Production Environment

#### Small Deployment (Personal Use)
- **Hardware**:
  - CPU: 2-4 cores
  - RAM: 4-8GB
  - Storage: 100GB+ (depends on library size)
  - Network: 1Gbps

#### Medium Deployment (Small Team)
- **Hardware**:
  - CPU: 4-8 cores
  - RAM: 8-16GB
  - Storage: 1TB+ with SSD caching
  - Network: 1Gbps with QoS

#### Enterprise Deployment
- **Infrastructure**:
  - Kubernetes cluster with 3+ nodes
  - Ceph or MinIO for distributed storage
  - Redis for caching
  - PostgreSQL for metadata (alternative to SQLite)
  - CDN for media delivery

#### Cloud Options
- **Google Cloud**:
  - Compute Engine with persistent disks
  - Cloud Run for serverless
  - Memorystore for Redis

- **AWS**:
  - ECS Fargate
  - RDS for PostgreSQL
  - ElastiCache for Redis
  - CloudFront for CDN

- **Hybrid**:
  - On-premises for primary storage
  - Cloud for CDN and edge caching
  - Cloudflare for DDoS protection

## Local Development

### Development Environment Setup

#### 1. Java Development Kit
```bash
# Install SDKMAN (Linux/macOS)
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 17 with JVM options for development
sdk install java 17.0.5-tem
sdk use java 17.0.5-tem

# Verify installation
java -version
javac -version

# Configure Maven for faster builds (settings.xml)
<settings>
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <maven.compiler.release>17</maven.compiler.release>
        <argLine>-Xmx2g -XX:+UseG1GC -XX:+UseStringDeduplication</argLine>
      </properties>
    </profile>
  </profiles>
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
</settings>
```

#### 2. Gradle Configuration
```bash
# gradle.properties
devMode=true
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.vfs.watch=true
org.gradle.unsafe.configuration-cache=true
```

#### 3. Docker Development Stack
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  komga:
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        - BUILDKIT_INLINE_CACHE=1
    container_name: komga-dev
    hostname: komga-dev
    domainname: local
    networks:
      - komga-net
    ports:
      - '25600:25600'
      - '5005:5005' # Debug port
    volumes:
      - './src:/app/src'
      - './gradle:/home/gradle/.gradle'
      - './build:/app/build'
      - './libraries:/libraries'
      - './config:/config'
    environment:
      - SPRING_PROFILES_ACTIVE=dev,debug
      - KOMGA_CONFIG_EXTRA_SERVER_PORT=25600
      - KOMGA_CONFIG_EXTRA_SERVER_ADDRESS=0.0.0.0
      - JAVA_TOOL_OPTIONS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
      - GRADLE_OPTS=-Dorg.gradle.daemon=true -Dorg.gradle.caching=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:25600/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  # Additional services for development
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=komga
      - POSTGRES_USER=komga
      - POSTGRES_PASSWORD=komga
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U komga"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Development tools
  mailhog:
    image: mailhog/mailhog
    ports:
      - "8025:8025" # Web UI
      - "1025:1025" # SMTP

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana

networks:
  komga-net:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

#### 4. Development Dockerfile
```dockerfile
# Dockerfile.dev
FROM gradle:7.6-jdk17 AS build

# Install development tools
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy build files
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
COPY gradle ./gradle

# Download dependencies
RUN gradle --no-daemon dependencies

# Copy source code
COPY src ./src

# Build application
RUN gradle --no-daemon build

# Development entry point
ENTRYPOINT ["./gradlew", "bootRun", "--args=--spring.profiles.active=dev"]
```

#### 5. Development Workflow

##### Hot Reloading Setup
```bash
# Install the Spring Boot DevTools for automatic restart
# build.gradle.kts
dependencies {
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    // ...
}

# Configure build to always restart
spring:
  devtools:
    restart:
      enabled: true
      additional-exclude: static/**,templates/**,public/**
    livereload:
      enabled: true
```

##### Database Migrations
```bash
# Install Flyway
# build.gradle.kts
implementation("org.flywaydb:flyway-core")

# Create migration files in:
# src/main/resources/db/migration/V1__Initial_schema.sql
# src/main/resources/db/migration/V2__Add_new_feature.sql
```

##### API Development
```bash
# Generate API documentation
./gradlew ktlintFormat ktlintCheck asciidoctor

# View API docs at:
# build/asciidoc/html5/index.html
```

##### Testing Workflow
```bash
# Run unit tests with coverage
./gradlew test jacocoTestReport

# Run integration tests
./gradlew integrationTest

# Run specific test with debug output
./gradlew test --tests "com.example.MyTest" --info --debug
```

#### 6. Development Tools

##### IntelliJ IDEA Setup
1. Install plugins:
   - Kotlin
   - Spring Boot
   - Database Tools
   - Docker
   - Git Integration

2. Recommended settings:
   ```
   Editor -> General -> Auto Import
     - Add unambiguous imports on the fly: true
     - Optimize imports on the fly: true
   
   Build, Execution, Deployment -> Build Tools -> Gradle
     - Build and run using: IntelliJ IDEA
     - Run tests using: IntelliJ IDEA
   ```

##### VS Code Setup
1. Install extensions:
   - Kotlin Language
   - Spring Boot Tools
   - Spring Boot Dashboard
   - Docker
   - Remote - Containers

2. Recommended settings (`settings.json`):
   ```json
   {
     "java.configuration.updateBuildConfiguration": "automatic",
     "kotlin.languageServer.enabled": true,
     "kotlin.languageServer.path": "/path/to/kotlin-language-server",
     "spring-boot.ls.jvmArgs": ["-Xmx4G", "-XX:+UseG1GC"],
     "java.jdt.ls.vmargs": "-XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx4G -Xms100m -javaagent:/path/to/lombok.jar"
   }
   ```

#### 7. Remote Development

##### Tailscale Setup
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
sudo tailscale up --accept-routes --advertise-routes=192.168.1.0/24

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Make IP forwarding persistent
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
```

##### SSH Configuration
```bash
# ~/.ssh/config
Host komga-dev
  HostName 100.x.y.z  # Tailscale IP
  User your-username
  Port 22
  IdentityFile ~/.ssh/id_ed25519
  ServerAliveInterval 60
  ServerAliveCountMax 3
  TCPKeepAlive yes
  Compression yes
  ForwardAgent yes
  
  # For X11 forwarding
  ForwardX11 no
  ForwardX11Trusted yes
  
  # For remote development
  RemoteForward 52698 127.0.0.1:52698  # rmate
  RemoteForward 63342 127.0.0.1:63342  # IntelliJ remote debug
  
  # Performance optimizations
  IPQoS=throughput
  Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
  MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-512,hmac-sha2-256,umac-128@openssh.com
  HostKeyAlgorithms ssh-ed25519,ssh-rsa,rsa-sha2-256,rsa-sha2-512
  KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group18-sha512,diffie-hellman-group16-sha512,diffie-hellman-group14-sha256
```

#### 8. Development Scripts

##### Setup Script
```bash
#!/bin/bash
# setup-dev.sh

# Install development tools
sudo apt update && sudo apt install -y \
  jq \
  httpie \
  htop \
  ncdu \
  tig \
  tmux \
  zsh \
  fzf \
  ripgrep \
  fd-find \
  bat \
  exa \
  duf \
  procs \
  dust \
  tokei \
  hyperfine \
  zoxide \
  neovim

# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java
sdk install java 17.0.5-tem
sdk default java 17.0.5-tem

# Install Gradle
sdk install gradle 7.6
sdk default gradle 7.6

# Install Docker
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Install development tools
cargo install --locked \
  cargo-update \
  cargo-edit \
  cargo-audit \
  cargo-outdated \
  cargo-udeps \
  cargo-nextest \
  cargo-watch \
  cargo-expand \
  cargo-udeps \
  cargo-tree \
  cargo-msrv \
  cargo-bloat \
  cargo-geiger \
  cargo-tarpaulin \
  cargo-llvm-cov \
  cargo-udeps \
  cargo-sweep

echo "Development environment setup complete!"
```

##### Build Script
```bash
#!/bin/bash
# build.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BUILD_TYPE=${1:-debug}
TARGET=${2:-all}

# Build function
build() {
  echo -e "${GREEN}Building ${BUILD_TYPE} build for ${TARGET}...${NC}"  
  
  # Clean previous build
  if [[ "$BUILD_TYPE" == "release" ]]; then
    ./gradlew clean build -x test --no-daemon --build-cache \
      -Pprofile=release \
      -Pkotlin.incremental=true \
      -Dorg.gradle.caching=true \
      -Dorg.gradle.parallel=true \
      -Dorg.gradle.vfs.watch=true \
      -Dfile.encoding=UTF-8 \
      --stacktrace
  else
    ./gradlew clean build -x test --no-daemon --build-cache \
      -Pprofile=dev \
      -Pkotlin.incremental=true \
      -Dorg.gradle.caching=true \
      -Dorg.gradle.parallel=true \
      -Dorg.gradle.vfs.watch=true \
      -Dfile.encoding=UTF-8 \
      --stacktrace \
      --continuous
  fi
}

# Main execution
case "$TARGET" in
  all)
    build
    ;;
  run)
    build
    ./gradlew bootRun --args='--spring.profiles.active=dev'
    ;;
  test)
    ./gradlew test --tests "$3"
    ;;
  *)
    echo -e "${RED}Unknown target: $TARGET${NC}"
    echo "Usage: $0 [debug|release] [all|run|test] [test-class]"
    exit 1
    ;;
esac
```

#### 9. Development Workflow Tips

##### Git Workflow
```bash
# Pre-commit hook (.git/hooks/pre-commit)
#!/bin/sh

# Run ktlint
./gradlew ktlintCheck
if [ $? -ne 0 ]; then
  echo "Kotlin lint check failed"
  exit 1
fi

# Run tests
./gradlew test
if [ $? -ne 0 ]; then
  echo "Tests failed"
  exit 1
fi

exit 0
```

##### Database Management
```bash
# Start database console
./gradlew flywayInfo
./gradlew flywayMigrate

# Generate migration
DATE=$(date +%Y%m%d%H%M%S)
NAME="add_new_feature"
touch "src/main/resources/db/migration/V${DATE}__${NAME}.sql"
```

##### Performance Profiling
```bash
# Generate heap dump on OOM
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./heap-dump.hprof

# Flight recording
-XX:StartFlightRecording=filename=profile.jfr,duration=60s

# Debug JVM
-XX:+UnlockDiagnosticVMOptions -XX:+PrintCompilation -XX:+PrintInlining
```

#### 10. Development Troubleshooting

##### Common Issues

**Build Failures**
```bash
# Clean and rebuild
./gradlew clean build --refresh-dependencies --stacktrace --info

# Check dependency conflicts
./gradlew dependencies

# Update dependencies
./gradlew dependencyUpdates
```

**Database Issues**
```bash
# Reset database
rm -rf ./data/komga/*

# Check database integrity
sqlite3 data/komga/komga.sqlite "PRAGMA integrity_check;"

# Rebuild database
./gradlew flywayClean flywayMigrate
```

**Memory Issues**
```bash
# Check memory usage
jps -lvm
jstat -gc <pid>
jmap -heap <pid>

# Generate heap dump
jmap -dump:live,format=b,file=heap.hprof <pid>

# Analyze with Eclipse MAT or VisualVM
```

**Network Issues**
```bash
# Check ports
sudo lsof -i :25600
netstat -tulpn | grep 25600

# Test connectivity
telnet localhost 25600
curl -v http://localhost:25600/actuator/health

# Check firewall
sudo ufw status
sudo iptables -L -n -v
```

### Running with Gradle
```bash
# Development mode with auto-reload
./gradlew bootRun --args='--spring.profiles.active=dev'

# With debug logging
./gradlew bootRun --args='--debug --logging.level.org.gotson.komga=DEBUG'
```

### Using Docker Compose
```yaml
# docker-compose.dev.yml
version: '3.3'
services:
  komga:
    build: .
    container_name: komga-dev
    ports:
      - '25600:25600'
    volumes:
      - './config:/config'
      - './libraries:/libraries'
      - './src:/app/src'
    environment:
      - SPRING_PROFILES_ACTIVE=dev
    restart: unless-stopped
```

### Secure Remote Access with Tailscale
1. Install Tailscale on your development machine
2. Bind Komga to your Tailscale IP:
   ```bash
   ./gradlew bootRun --args='--server.address=100.x.y.z --server.port=25600'
   ```
3. Access from any Tailscale-connected device at `http://100.x.y.z:25600`

## GitHub Workflow & Release Management

### Repository Structure
```
.github/
├── workflows/
│   ├── ci.yml          # Continuous Integration
│   ├── cd.yml         # Continuous Deployment
│   ├── release.yml    # Release automation
│   └── dependabot.yml # Dependency updates
```

### GitHub Actions Workflows

#### 1. Continuous Integration (CI)
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: komga
          POSTGRES_PASSWORD: komga
          POSTGRES_DB: komga
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: 'gradle'
    
    - name: Grant execute permission for gradlew
      run: chmod +x gradlew
      
    - name: Build with Gradle
      run: ./gradlew build --scan --no-daemon
      env:
        SPRING_PROFILES_ACTIVE: ci
        SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/komga
        SPRING_DATASOURCE_USERNAME: komga
        SPRING_DATASOURCE_PASSWORD: komga

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: build/test-results/test
        retention-days: 7
        if-no-files-found: ignore

    - name: Upload code coverage
      uses: actions/upload-artifact@v3
      with:
        name: code-coverage
        path: build/reports/jacoco/test
        retention-days: 7
        if-no-files-found: ignore
```

#### 2. Release Automation
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*' # Push events matching v1.0, v20.15.10, etc.

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Grant execute permission for gradlew
      run: chmod +x gradlew
    
    - name: Build and package
      run: |
        VERSION=${GITHUB_REF#refs/tags/v}
        ./gradlew build -x test -Pversion=$VERSION
        mkdir -p release
        cp build/libs/komga-*.jar release/
    
    - name: Create Release
      id: create_release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref_name }}
        draft: false
        prerelease: false
    
    - name: Upload Release Assets
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.create_release.outputs.upload_url }}
        asset_path: ./release/komga-${{ github.ref_name }}.jar
        asset_name: komga-${{ github.ref_name }}.jar
        asset_content_type: application/java-archive
    
    - name: Publish to Docker Hub
      uses: docker/build-push-action@v4
      with:
        push: true
        tags: |
          gotson/komga:latest
          gotson/komga:${{ github.ref_name }}
```

#### 3. Dependency Updates
```yaml
# .github/dependabot.yml
version: 2
updates:
  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels: ["dependencies"]

  # Enable version updates for Gradle
  - package-ecosystem: "gradle"
    directory: "/"
    schedule:
      interval: "weekly"
    labels: ["dependencies"]
    groups:
      gradle:
        patterns:
          - "*"
```

### Release Process

#### 1. Versioning
Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: Backward-compatible features
- **PATCH**: Backward-compatible bug fixes

#### 2. Creating a Release
```bash
# Update version in gradle.properties
version=1.0.0

# Create release branch
git checkout -b release/v1.0.0

# Update changelog
# ...

# Commit changes
git add .
git commit -m "Prepare for release v1.0.0"

# Create tag
git tag -a v1.0.0 -m "Version 1.0.0"

# Push to GitHub
git push origin v1.0.0
```

### Developer Tooling

#### 1. VS Code Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "eamodio.gitlens",
    "pivotal.vscode-spring-boot",
    "vscjava.vscode-spring-initializr",
    "vscjava.vscode-spring-boot-dashboard",
    "vscjava.vscode-spring-boot",
    "vscjava.vscode-gradle",
    "mathiasfrohlich.kotlin",
    "fwcd.kotlin",
    "naco-siren.gradle-language",
    "ms-azuretools.vscode-docker",
    "redhat.java",
    "pivotal.vscode-spring-boot",
    "vscjava.vscode-java-pack",
    "vscjava.vscode-java-debug",
    "vscjava.vscode-java-test",
    "vscjava.vscode-maven",
    "richardwillis.vscode-gradle-extension-pack"
  ]
}
```

#### 2. Git Configuration
```gitconfig
# .gitconfig
[core]
    editor = code --wait
    autocrlf = input
    excludesfile = ~/.gitignore_global
[user]
    name = Your Name
    email = your.email@example.com
[push]
    default = current
[alias]
    co = checkout
    ci = commit
    st = status
    br = branch
    hist = log --pretty=format:'%h %ad | %s%d [%an]' --graph --date=short
    type = cat-file -t
    dump = cat-file -p
    lg = log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %C(white)%s%C(reset) %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all
[filter "lfs"]
    clean = git-lfs clean -- %f
    smudge = git-lfs smudge -- %f
    process = git-lfs filter-process
    required = true
[merge]
    tool = vscode
[mergetool "vscode"]
    cmd = code --wait $MERGED
[diff]
    tool = vscode
[difftool "vscode"]
    cmd = code --wait --diff $LOCAL $REMOTE
[commit]
    template = ~/.gitmessage
```

#### 3. Git Hooks
```bash
# .githooks/pre-commit
#!/bin/sh

# Run ktlint
./gradlew ktlintCheck
if [ $? -ne 0 ]; then
  echo "Kotlin lint check failed"
  exit 1
fi

# Run tests
./gradlew test
if [ $? -ne 0 ]; then
  echo "Tests failed"
  exit 1
fi

exit 0
```

### Code Review Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   ```

3. **Push to GitHub**
   ```bash
   git push -u origin feature/amazing-feature
   ```

4. **Create Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Add reviewers
   - Link related issues using keywords (fixes #123)
   - Wait for CI to pass
   - Get approvals
   - Squash and merge

## Production Deployment

### Kubernetes Deployment

#### 1. Helm Chart
```yaml
# komga/values.yaml
replicaCount: 3

image:
  repository: gotson/komga
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 8080
  targetPort: 8080

persistence:
  enabled: true
  storageClass: ""
  accessModes: ["ReadWriteOnce"]
  size: 100Gi

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

livenessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 120
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

nodeSelector: {}
tolerations: []
affinity: {}
```

#### 2. High Availability
```yaml
# komga/values-production.yaml
replicaCount: 3

podAntiAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
              - komga
      topologyKey: "kubernetes.io/hostname"

resources:
  limits:
    cpu: 4000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 2Gi

# External database configuration
config:
  SPRING_DATASOURCE_URL: jdbc:postgresql://postgresql:5432/komga
  SPRING_DATASOURCE_USERNAME: komga
  SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
  SPRING_REDIS_HOST: redis
  SPRING_REDIS_PORT: 6379
```

### Monitoring Stack

#### 1. Prometheus Configuration
```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'komga'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['komga:8080']
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox:9115
```

#### 2. Grafana Dashboard
Import the following dashboard for Komga monitoring:
- JVM Metrics
- HTTP Request Metrics
- Database Connection Pool
- Cache Statistics
- System Resources

### Security Hardening

#### 1. Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: komga-network-policy
spec:
  podSelector:
    matchLabels:
      app: komga
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: komga
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

#### 2. Pod Security Policies
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: komga-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
  fsGroup:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
```

### Performance Optimization

#### 1. JVM Options
```yaml
# application-prod.yml
server:
  port: 8080
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/html,text/xml,text/plain,application/javascript,text/css
    min-response-size: 1024

spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
        batch_versioned_data: true
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 30000
      max-lifetime: 1200000
      connection-timeout: 30000
      leak-detection-threshold: 60000
  cache:
    type: redis
    redis:
      time-to-live: 1h
      cache-null-values: false
```

## Future Roadmap: Innovation and AI Integration

### 1. AI-Powered Features

#### 1.1 Smart Metadata Enhancement
```python
# ai/metadata_enhancer.py
from transformers import pipeline
import spacy

class MetadataEnhancer:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_lg")
        self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        self.ner = pipeline("ner", model="dbmdz/bert-large-cased-finetuned-conll03-english")
    
    def enhance_metadata(self, text_content, existing_metadata):
        # Extract key entities
        doc = self.nlp(text_content)
        entities = {ent.label_: ent.text for ent in doc.ents}
        
        # Generate summary
        summary = self.summarizer(text_content, max_length=130, min_length=30, do_sample=False)[0]['summary_text']
        
        # Extract named entities
        named_entities = self.ner(text_content)
        
        # Update metadata
        enhanced = {
            **existing_metadata,
            'ai_summary': summary,
            'detected_entities': entities,
            'named_entities': named_entities,
            'last_enhanced': datetime.utcnow().isoformat()
        }
        return enhanced
```

#### 1.2 Content-Based Recommendations
```python
# ai/recommendation_engine.py
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class RecommendationEngine:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.content_embeddings = {}
    
    def add_content(self, content_id, text):
        self.content_embeddings[content_id] = self.model.encode(text)
    
    def get_similar_content(self, content_id, top_n=5):
        if content_id not in self.content_embeddings:
            return []
            
        target_embedding = self.content_embeddings[content_id]
        similarities = []
        
        for cid, embedding in self.content_embeddings.items():
            if cid == content_id:
                continue
            sim = cosine_similarity(
                target_embedding.reshape(1, -1),
                embedding.reshape(1, -1)
            )[0][0]
            similarities.append((cid, sim))
        
        return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_n]
```

### 2. Advanced Features

#### 2.1 Cross-Platform Sync
- **Unified Reading Progress**: Sync reading position across all devices
- **Offline Mode**: Download books/comics for offline reading
- **Progressive Web App (PWA)**: Installable web app with native-like experience

#### 2.2 Enhanced Social Features
- **Book Clubs**: Create and join reading groups
- **Reading Challenges**: Set and track reading goals
- **Social Sharing**: Share quotes, reviews, and recommendations

#### 2.3 Advanced Search & Discovery
- **Semantic Search**: Find content by meaning, not just keywords
- **Visual Search**: Upload an image to find similar covers or artwork
- **Advanced Filters**: Combine multiple criteria for precise discovery

### 3. Technical Innovations

#### 3.1 Edge Computing
```python
# edge/processor.py
class EdgeProcessor:
    def __init__(self):
        self.cache = {}
        self.local_model = load_local_ai_model()
    
    async def process_request(self, request):
        # Check cache first
        cache_key = self._generate_cache_key(request)
        if cached := self.cache.get(cache_key):
            return cached
        
        # Process with local model
        result = await self.local_model.process(request)
        
        # Cache result
        self.cache[cache_key] = result
        return result
```

#### 3.2 Blockchain for Digital Ownership
- **NFT Integration**: Verify ownership of digital editions
- **Decentralized Storage**: IPFS for content distribution
- **Smart Contracts**: Manage lending/borrowing of digital content

### 4. Accessibility Features

#### 4.1 Text-to-Speech
```python
# tts/engine.py
class TextToSpeechEngine:
    def __init__(self):
        self.engine = initialize_tts_engine()
        self.voices = {
            'en': 'en-US-Wavenet-D',
            'es': 'es-ES-Wavenet-B',
            'fr': 'fr-FR-Wavenet-A',
            'de': 'de-DE-Wavenet-F',
            'ja': 'ja-JP-Wavenet-B'
        }
    
    def generate_speech(self, text, language='en', speed=1.0):
        voice = self.voices.get(language, 'en-US-Wavenet-D')
        audio_config = {
            'voice': voice,
            'speaking_rate': speed,
            'pitch': 0,
            'volume_gain_db': 0.0
        }
        return self.engine.synthesize_speech(text, audio_config)
```

#### 4.2 Enhanced Reading Experience
- **Dyslexia-Friendly Fonts**: OpenDyslexic and other accessible fonts
- **Customizable Reading Modes**: Dark/light themes, sepia, etc.
- **Reading Assistant**: Built-in dictionary and translation

### 5. Integration Ecosystem

#### 5.1 API Gateway
```yaml
# api-gateway/configuration.yaml
routes:
  - uri: /api/v1/books/**
    filters:
      - name: CircuitBreaker
        args:
          name: books-service
          fallbackUri: forward:/fallback/books
    predicates:
      - Path=/api/v1/books/**
    uri: lb://books-service

  - uri: /api/v1/recommendations/**
    filters:
      - name: Retry
        args:
          retries: 3
          statuses: BAD_GATEWAY,SERVICE_UNAVAILABLE,GATEWAY_TIMEOUT
    predicates:
      - Path=/api/v1/recommendations/**
    uri: lb://recommendation-service
```

#### 5.2 Plugin System
- **Custom Processors**: Add custom metadata extractors
- **Theme Engine**: Create and share custom UI themes
- **Integration Hooks**: Connect with other services (Goodreads, AniList, etc.)

### 6. Analytics & Insights

#### 6.1 Reading Analytics
```python
# analytics/reading_insights.py
class ReadingAnalytics:
    def __init__(self, user_id):
        self.user_id = user_id
        self.db = connect_to_analytics_db()
    
    def get_reading_habits(self, time_period='30d'):
        return self.db.query("""
            SELECT 
                date_trunc('day', read_at) as day,
                COUNT(*) as pages_read,
                SUM(time_spent) as reading_time
            FROM reading_sessions
            WHERE user_id = ? AND read_at >= NOW() - ?::interval
            GROUP BY 1
            ORDER BY 1
        """, (self.user_id, time_period))
    
    def get_reading_goals(self):
        return {
            'daily_goal': self._calculate_daily_goal(),
            'weekly_goal': self._calculate_weekly_goal(),
            'monthly_goal': self._calculate_monthly_goal()
        }
```

### 7. Security & Privacy

#### 7.1 Data Protection
- **End-to-End Encryption**: For personal notes and highlights
- **Privacy Controls**: Granular control over data sharing
- **GDPR Compliance**: Data export and deletion tools

#### 7.2 Authentication
- **Multi-Factor Authentication**: Enhanced account security
- **OAuth Providers**: Login with Google, Apple, etc.
- **Passwordless Authentication**: Magic links and biometrics

### 8. Community & Collaboration

#### 8.1 Crowdsourced Metadata
- **Wiki-Style Editing**: Community-driven metadata improvements
- **Content Moderation**: Tools for community moderation
- **Quality Scoring**: Rate the quality of metadata and translations

#### 8.2 Developer Platform
- **Public API**: Comprehensive API documentation
- **SDKs**: Client libraries for popular languages
- **Developer Portal**: Tutorials, examples, and support

### Implementation Roadmap

#### Phase 1: Foundation (0-3 months)
1. Implement core AI features
2. Set up analytics pipeline
3. Basic PWA functionality

#### Phase 2: Enhancement (3-6 months)
1. Advanced recommendation engine
2. Social features
3. Plugin system

#### Phase 3: Expansion (6-12 months)
1. Blockchain integration
2. Edge computing
3. Advanced accessibility features

#### Phase 4: Maturity (12+ months)
1. Full ecosystem integration
2. Enterprise features
3. Advanced security and compliance

## Conclusion

This roadmap outlines a comprehensive strategy for transforming Komga into a next-generation digital media platform. By leveraging modern technologies and focusing on user experience, we can create a product that stands out in the market and delivers exceptional value to our users.

### Option A: Docker (Recommended)
```yaml
# docker-compose.prod.yml
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
    environment:
      - KOMGA_CONFIG_EXTRA_SERVER_ADDRESS=0.0.0.0
      - SPRING_PROFILES_ACTIVE=prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:25600/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Option B: Bare Metal
1. Build the application:
   ```bash
   ./gradlew bootJar
   ```
2. Create a systemd service (`/etc/systemd/system/komga.service`):
   ```ini
   [Unit]
   Description=Komga
   After=network.target

   [Service]
   User=komga
   WorkingDirectory=/opt/komga
   ExecStart=/usr/bin/java -jar /opt/komga/komga.jar \
     --server.port=25600 \
     --komga.database.file=/var/lib/komga/komga.sqlite \
     --komga.libraries.root-directory=/mnt/libraries
   SuccessExitStatus=143
   TimeoutStopSec=10
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

## Security Considerations

### 1. HTTPS Configuration
```yaml
# application-prod.yml
server:
  ssl:
    enabled: true
    key-store: file:/path/to/keystore.p12
    key-store-password: ${KEYSTORE_PASSWORD}
    key-store-type: PKCS12
```

### 2. Authentication
- Enable basic authentication in `application.yml`
- Consider OAuth2 for enterprise deployments
- Use environment variables for sensitive data

### 3. Network Security
- Use a reverse proxy (Nginx, Traefik)
- Implement rate limiting
- Restrict access with Tailscale ACLs

## Backup Strategy

### Automated Backup Script
```bash
#!/bin/bash
# backup-komga.sh

# Configuration
BACKUP_DIR="/backup/komga"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
sqlite3 /path/to/komga/database.sqlite ".backup '$BACKUP_DIR/komga_db_$TIMESTAMP.sqlite'"

# Backup configuration
tar -czf "$BACKUP_DIR/komga_config_$TIMESTAMP.tar.gz" /path/to/komga/config

# Backup libraries (if needed)
# rsync -a --delete /path/to/libraries "$BACKUP_DIR/libraries_$TIMESTAMP"

# Cleanup old backups
find "$BACKUP_DIR" -type f -mtime +$KEEP_DAYS -delete

# Optional: Sync to cloud storage
# rclone sync "$BACKUP_DIR" "your-remote:komga-backups"
```

### Schedule with Cron
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-komga.sh
```

## Monitoring

### Health Checks
```bash
# Basic health check
curl -f http://localhost:25600/actuator/health

# Detailed info (requires authentication)
curl -u user:password http://localhost:25600/actuator/info
```

### Logging Configuration
```yaml
# application-prod.yml
logging:
  file:
    name: logs/komga.log
    max-size: 50MB
    max-history: 7
  level:
    root: INFO
    org.gotson.komga: INFO
    org.springframework: WARN
```

### Monitoring Tools
- **Prometheus + Grafana** for metrics
- **Loki + Promtail** for logs
- **Uptime Kuma** for uptime monitoring

## Troubleshooting

### Common Issues

#### Database Locked
```bash
# Check for locked database
fuser /path/to/komga/database.sqlite

# If needed, remove lock file (use with caution)
rm /path/to/komga/database.sqlite-*
```

#### Port Already in Use
```bash
# Find the process using the port
sudo lsof -i :25600

# Or on Windows
netstat -ano | findstr :25600
```

#### Memory Issues
```bash
# Run with increased heap size
java -Xmx2g -jar komga.jar

# Enable GC logging
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log
```

### Getting Help
- [GitHub Issues](https://github.com/gotson/komga/issues)
- [Discord Community](https://komga.org/community/)
- [Documentation](https://komga.org/)

## Upgrading

1. Backup your data
2. Check the [changelog](https://github.com/gotson/komga/blob/master/CHANGELOG.md) for breaking changes
3. Update the Docker image or rebuild from source
4. Test thoroughly before deploying to production

Remember to always test upgrades in a staging environment first!
