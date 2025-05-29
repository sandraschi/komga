#!/usr/bin/env python3
"""
Build and Analyze Script for Komga
A more reliable Python version of the build script.
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

# Color codes for console output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_color(text, color=Colors.ENDC, end='\n'):
    """Print colored text to console."""
    print(f"{color}{text}{Colors.ENDC}", end=end)

def verify_gradle():
    """Verify that Gradle is working."""
    try:
        print_color("Verifying Gradle...", Colors.CYAN)
        result = subprocess.run(
            ["gradlew.bat", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        print_color("  ✓ Gradle is working", Colors.GREEN)
        return True
    except subprocess.CalledProcessError as e:
        print_color(f"  ❌ Gradle verification failed: {e}", Colors.RED)
        if e.stderr:
            print_color(f"  Error details: {e.stderr.strip()}", Colors.RED)
        return False
    except Exception as e:
        print_color(f"  ❌ Error checking Gradle: {e}", Colors.RED)
        return False

def clean_gradle_caches():
    """Clean Gradle caches."""
    print("Cleaning Gradle caches...")
    try:
        # Clean Gradle caches
        caches = [
            os.path.expanduser('~/.gradle/caches/'),
            os.path.join(os.getcwd(), '.gradle/caches/')
        ]
        
        for cache_dir in caches:
            if os.path.exists(cache_dir):
                print(f"  Removing cache: {cache_dir}")
                shutil.rmtree(cache_dir, ignore_errors=True)
        
        # Stop any running daemons
        run_gradle_task(["--stop"], "gradle_stop.log")
        return True
    except Exception as e:
        print_color(f"  ⚠️  Failed to clean Gradle caches: {e}", Colors.YELLOW)
        return False

def clean_directories():
    """Clean build directories."""
    print("\n=== Cleaning Build Directories ===")
    success = True
    
    try:
        # First verify Gradle is working
        if not verify_gradle():
            print_color("❌ Gradle verification failed. Cannot proceed with cleanup.", Colors.RED)
            return False
        
        # Clean Gradle caches first
        clean_gradle_caches()
        
        # Run Gradle clean
        print("Running Gradle clean...")
        clean_result = run_gradle_task(["clean", "--no-daemon"], "clean.log")
        if clean_result != 0:
            print_color("  ⚠️  Gradle clean completed with warnings", Colors.YELLOW)
        else:
            print("  ✓ Gradle clean completed")
        
        # Remove build directories
        dirs_to_remove = [
            'build',
            '.gradle',
            'app/build',
            'komga/build',
            'bin',
            'out'
        ]
        
        for dir_name in dirs_to_remove:
            dir_path = Path(dir_name)
            if dir_path.exists():
                try:
                    print(f"  Removing directory: {dir_name}")
                    shutil.rmtree(dir_path, ignore_errors=True)
                except Exception as e:
                    print_color(f"  ⚠️  Failed to remove {dir_name}: {e}", Colors.YELLOW)
                    success = False
        
        # Clean Gradle caches again to be thorough
        clean_gradle_caches()
        
        if success:
            print("  ✓ Cleanup completed successfully")
        else:
            print("  ⚠️  Cleanup completed with some warnings")
            
    except Exception as e:
        print_color(f"  ❌ Cleanup failed: {e}", Colors.RED)
        success = False
        
    return success

def run_gradle_task(gradle_args, log_file):
    """Run Gradle with the given arguments and capture output.
    
    Args:
        gradle_args: List of arguments to pass to Gradle
        log_file: Path to the log file
    """
    env = os.environ.copy()
    env.update({
        'GRADLE_OPTS': '-Xmx2048m -Dorg.gradle.daemon=false',
        'JAVA_OPTS': '-Xmx2048m'
    })
    
    # Prepare the command
    if os.name == 'nt':
        # On Windows, use the batch file directly
        gradle_script = os.path.join(os.getcwd(), 'gradlew.bat')
        cmd = [gradle_script] + gradle_args
        shell = True
    else:
        # On Unix-like systems
        gradle_script = './gradlew'
        cmd = [gradle_script] + gradle_args
        shell = False
    
    # Log the command
    cmd_str = ' '.join(f'"{arg}"' if ' ' in arg else arg for arg in cmd)
    print_color(f"Running: {cmd_str}", Colors.YELLOW)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"\n=== Running: {cmd_str} ===\n")
    
    try:
        # Run the command
        process = subprocess.Popen(
            cmd_str if os.name == 'nt' else cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            bufsize=1,
            universal_newlines=True,
            shell=shell,
            cwd=os.getcwd()
        )
        
        # Stream output in real-time
        while True:
            # Read from stdout and stderr
            stdout_line = process.stdout.readline()
            stderr_line = process.stderr.readline()
            
            # Process stdout
            if stdout_line:
                print(stdout_line.strip())
                with open(log_file, 'a', encoding='utf-8') as f:
                    f.write(stdout_line)
            
            # Process stderr
            if stderr_line:
                print_color(stderr_line.strip(), Colors.RED)
                with open(log_file, 'a', encoding='utf-8') as f:
                    f.write(f"[ERROR] {stderr_line}")
            
            # Check if process has completed
            if process.poll() is not None and not stdout_line and not stderr_line:
                break
        
        # Get any remaining output
        stdout, stderr = process.communicate()
        
        # Process remaining stdout
        if stdout:
            print(stdout.strip())
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(stdout)
        
        # Process remaining stderr
        if stderr:
            print_color("\n=== Gradle Errors ===", Colors.RED)
            print_color(stderr.strip(), Colors.RED)
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write("\n=== Errors ===\n" + stderr)
        
        return process.returncode
        
    except Exception as e:
        error_msg = f"❌ Error running Gradle: {e}"
        print_color(error_msg, Colors.RED)
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{error_msg}\n")
        return 1

def parse_arguments():
    """Parse command line arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Build and analyze the project.')
    parser.add_argument('--stacktrace', action='store_true',
                      help='Show stacktraces for build failures')
    parser.add_argument('--task', default='build',
                      help='Gradle task to run (default: build)')
    parser.add_argument('--no-clean', action='store_true',
                      help='Skip cleaning build directories')
    
    return parser.parse_args()

def main():
    """Main function to run the build process."""
    args = parse_arguments()
    
    # Create timestamp for log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"build_output_{timestamp}.log"
    
    print_color("=== Starting Build and Analyze ===", Colors.HEADER)
    print_color(f"Log file: {log_file}")
    
    if not args.no_clean:
        # Clean build directories
        print_color("\n=== Cleaning Build Directories ===", Colors.CYAN)
        clean_success = clean_directories()
        if not clean_success:
            print_color("  ⚠️  Some cleanup steps had issues, but continuing with build...", Colors.YELLOW)
        else:
            print_color("  ✓ Cleanup completed successfully", Colors.GREEN)
    else:
        print_color("\n=== Skipping Cleanup (--no-clean) ===", Colors.YELLOW)
    
    # Prepare Gradle arguments
    gradle_args = [args.task, '--no-daemon', '--info']
    if args.stacktrace:
        gradle_args.append('--stacktrace')
    
    # Run build
    print_color("\n=== Running Build ===", Colors.CYAN)
    exit_code = run_gradle_task(gradle_args, log_file)
    
    if exit_code == 0:
        print_color("\n✅ Build completed successfully!", Colors.GREEN)
    else:
        print_color("\n❌ Build failed!", Colors.RED)
    
    print_color(f"\nLog file: {os.path.abspath(log_file)}")
    return exit_code

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print_color("\nBuild cancelled by user.", Colors.YELLOW)
        sys.exit(1)
