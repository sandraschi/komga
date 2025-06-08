# Repository Cleanup and Reorganization Plan

## Table of Contents
1. [Goals](#goals)
2. [Inventory](#inventory)
3. [Consolidation Strategy](#consolidation-strategy)
4. [Repository Categorization](#repository-categorization)
5. [Migration Steps](#migration-steps)
6. [Verification Process](#verification-process)
7. [Rollback Plan](#rollback-plan)
8. [Timeline](#timeline)
9. [Risk Assessment](#risk-assessment)
10. [Post-Cleanup Actions](#post-cleanup-actions)

## Goals

1. **Reduce Duplication**
   - Eliminate redundant codebases
   - Consolidate similar functionality
   - Remove abandoned experiments

2. **Improve Maintainability**
   - Standardize project structure
   - Update dependencies
   - Improve documentation

3. **Enhance Discoverability**
   - Clear project categorization
   - Consistent naming conventions
   - Better documentation

## Inventory

### Current Repository Structure
```
CascadeProjects/
├── Active/
│   ├── komga++/
│   ├── windsurf-agentic-automator/
│   └── myai/
├── Archive/
│   ├── kyoyu-chess/
│   └── wakan-archive/
└── Delete/
    ├── temp-experiments/
    └── duplicate-repos/
```

## Consolidation Strategy

### 1. Active Development
- **komga++** (New monorepo)
  - Document tool
  - Core functionality
  - Shared libraries

### 2. Maintenance Mode
- **windsurf-agentic-automator**
- **myai**
- **sas_calibre_toolbox**

### 3. Archive
- **kyoyu-chess-*** (consolidated)
- **pinpon** variants
- **wakan-archive**
- **tech-latin-archive**

### 4. Delete
- Duplicate test projects
- Abandoned experiments
- Outdated forks

## Repository Categorization

### Keep (Active Development)
| Repository | Purpose | Migration Needed |
|------------|---------|------------------|
| komga++ | Main monorepo | New |
| windsurf-agentic-automator | AI automation | None |
| myai | AI tools | Update deps |
| sas_calibre_toolbox | Calibre utilities | None |

### Archive (Read-Only)
| Repository | Reason | Notes |
|------------|--------|-------|
| kyoyu-chess-* | Consolidated | Keep history |
| pinpon* | Experimental | Reference only |
| wakan-archive | Historical | No active dev |

### Delete
| Repository | Reason | Backup Location |
|------------|--------|-----------------|
| temp-* | Temporary | None needed |
| test-* | Test code | Git history |
| duplicate-* | Duplicate | Keep one version |

## Migration Steps

### Phase 1: Preparation (Week 1)
1. **Backup Everything**
   ```powershell
   # Create backup of all repositories
   $backupDir = "C:\Backups\GitRepos_$(Get-Date -Format 'yyyyMMdd')"
   New-Item -ItemType Directory -Path $backupDir -Force
   Get-ChildItem -Path "C:\Users\sandr\CascadeProjects" -Directory | 
     ForEach-Object { 
       $dest = "$backupDir\$($_.Name).zip"
       Compress-Archive -Path $_.FullName -DestinationPath $dest
     }
   ```

2. **Document Current State**
   - Take screenshots of repository structures
   - Document any local configurations
   - Note any uncommitted changes

### Phase 2: Consolidation (Week 2-3)
1. **Create komga++ Monorepo**
   ```bash
   # Initialize new repository
   mkdir komga-plus-plus
   cd komga-plus-plus
   git init
   
   # Add document tool as submodule
   git submodule add https://github.com/yourusername/document-tool docs/
   ```

2. **Migrate Active Projects**
   - Move code into appropriate packages
   - Update import paths
   - Fix dependencies

### Phase 3: Cleanup (Week 4)
1. **Archive Inactive Repositories**
   ```powershell
   # Example: Archive a repository
   $repo = "kyoyu-chess"
   git archive --format=zip --output="$backupDir\$repo-archive-$(Get-Date -Format 'yyyyMMdd').zip" HEAD
   ```

2. **Remove Redundant Repositories**
   ```powershell
   # Example: Remove a repository (after verification)
   $reposToDelete = @("temp-experiment-1", "test-project-2")
   foreach ($repo in $reposToDelete) {
       $path = "C:\Users\sandr\CascadeProjects\$repo"
       if (Test-Path $path) {
           Remove-Item -Path $path -Recurse -Force
       }
   }
   ```

## Verification Process

1. **Pre-Migration**
   - [ ] All repositories backed up
   - [ ] Documentation updated
   - [ ] Team notified

2. **Post-Migration**
   - [ ] All tests pass
   - [ ] Builds complete successfully
   - [ ] Documentation reflects changes

3. **Final Check**
   - [ ] No broken links
   - [ ] All dependencies resolved
   - [ ] CI/CD pipelines working

## Rollback Plan

### If Issues Arise
1. **Immediate Rollback**
   ```powershell
   # Restore from backup
   $backup = "C:\Backups\GitRepos_20240530"
   Expand-Archive -Path "$backup\repository-name.zip" -DestinationPath "C:\Users\sandr\CascadeProjects\"
   ```

2. **Gradual Rollout**
   - Migrate one repository at a time
   - Verify at each step
   - Keep backups between steps

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Planning | 2 days | Finalize plan, notify team |
| Backup | 1 day | Complete backup of all repos |
| Migration | 5 days | Move code to new structure |
| Testing | 2 days | Verify functionality |
| Cleanup | 2 days | Remove old repositories |
| Documentation | 2 days | Update all documentation |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss | Low | High | Multiple backups |
| Build failures | Medium | High | Test before merge |
| Dependency issues | High | Medium | Pin versions |
| Team disruption | Medium | Low | Schedule during low activity |

## Post-Cleanup Actions

1. **Documentation**
   - Update README files
   - Create architecture diagrams
   - Document new workflows

2. **Automation**
   - Set up monitoring
   - Create maintenance scripts
   - Schedule regular cleanups

3. **Team Training**
   - New repository structure
   - Updated workflows
   - Best practices

## Next Steps

1. **Review and Approve**
   - [ ] Team reviews the plan
   - [ ] Schedule maintenance window
   - [ ] Assign responsibilities

2. **Prepare**
   - [ ] Create checklists
   - [ ] Set up backup systems
   - [ ] Notify stakeholders

3. **Execute**
   - [ ] Begin Phase 1 (Backup)
   - [ ] Proceed with migration
   - [ ] Verify and clean up
