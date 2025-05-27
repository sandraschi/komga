# Fork Management and Release Guide for Komga

## Table of Contents
1. [Syncing with Upstream](#syncing-with-upstream)
2. [Managing Releases](#managing-releases)
3. [Creating Your Own Releases](#creating-your-own-releases)
4. [Automating the Process](#automating-the-process)
5. [Best Practices](#best-practices)

## Syncing with Upstream

### Initial Setup

1. Add the original Komga repository as a remote:
   ```bash
   git remote add upstream https://github.com/gotson/komga.git
   git fetch upstream
   ```

### Syncing Process

1. Make sure you're on your main branch:
   ```bash
   git checkout main  # or master, depending on your default branch
   ```

2. Fetch the latest changes from upstream:
   ```bash
   git fetch upstream
   ```

3. Merge the upstream changes into your local branch:
   ```bash
   git merge upstream/main  # or upstream/master
   ```

4. If you have local changes, you might need to rebase:
   ```bash
   git pull --rebase upstream main
   ```

5. Push the updated branch to your fork:
   ```bash
   git push origin main
   ```

## Managing Releases

### When a New Komga Version is Released

1. Check the release notes for any breaking changes:
   ```bash
   # View recent tags
   git tag -l --sort=-v:refname | head -n 5
   
   # View changes between versions
   git log v0.160.0..v0.161.0 --oneline
   ```

2. Create a new branch for the update:
   ```bash
   git checkout -b update/v0.161.0
   ```

3. Merge the new tag:
   ```bash
   git merge v0.161.0
   ```

4. Resolve any merge conflicts:
   ```bash
   # After resolving conflicts
   git add .
   git commit -m "Resolve merge conflicts with v0.161.0"
   ```

5. Rebase your feature branches:
   ```bash
   git checkout your-feature-branch
   git rebase update/v0.161.0
   ```

## Creating Your Own Releases

### Building a Release

1. Update the version in `gradle.properties`:
   ```properties
   version=0.161.0-custom.1
   ```

2. Build the release:
   ```bash
   ./gradlew clean build
   ```

3. Create a tag:
   ```bash
   git tag -a v0.161.0-custom.1 -m "Custom release with omnibus support"
   git push origin v0.161.0-custom.1
   ```

### Creating a GitHub Release

1. Go to your fork on GitHub
2. Click "Releases" > "Draft a new release"
3. Select your tag
4. Add release notes
5. Attach the built JAR from `komga/build/libs/`
6. Publish the release

## Automating the Process

### GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'  # Push events to matching v* tags

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
      
    - name: Build with Gradle
      run: ./gradlew build
      
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
        
    - name: Upload Release Asset
      id: upload-release-asset 
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.create_release.outputs.upload_url }}
        asset_path: ./komga/build/libs/komga-${{ github.ref_name }}.jar
        asset_name: komga-${{ github.ref_name }}.jar
        asset_content_type: application/java-archive
```

## Best Practices

### Branch Strategy

1. `main` - Matches upstream releases
2. `develop` - Integration branch for your features
3. `feature/*` - Individual features
4. `release/*` - Release preparation branches

### Versioning

Follow semantic versioning with custom suffix:
- `1.2.3-custom.1` - First custom release based on 1.2.3
- `1.2.3-custom.2` - Next iteration with fixes

### Keeping Changes Organized

1. Keep your changes in feature branches
2. Rebase instead of merge when possible
3. Keep commits focused and atomic
4. Write clear commit messages

### Monitoring Upstream

1. Watch the Komga repository for releases
2. Subscribe to release notifications
3. Check the [changelog](https://github.com/gotson/komga/blob/master/CHANGELOG.md) regularly

## Troubleshooting

### Merge Conflicts

1. Use a visual merge tool:
   ```bash
   git mergetool
   ```

2. For complex conflicts, consider interactive rebase:
   ```bash
   git rebase -i HEAD~5  # Show last 5 commits
   ```

### Build Issues

1. Clean the build:
   ```bash
   ./gradlew clean
   rm -rf ~/.gradle/caches/
   ```

2. Check Java version:
   ```bash
   java -version
   ./gradlew --version
   ```

## Resources

- [GitHub Forking Guide](https://guides.github.com/activities/forking/)
- [GitHub Syncing a Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
