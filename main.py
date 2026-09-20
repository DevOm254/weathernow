#!/usr/bin/env python3
"""
WeatherNow - Fullstack Orchestrator
Runs both backend (Node.js/Express) and frontend (React/Vite) concurrently with a single command.
"""

import os
import sys
import time
import socket
import shutil
import signal
import threading
import subprocess
import webbrowser
from pathlib import Path

# Ensure UTF-8 output encoding and line buffering in Windows terminal
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass

# Enable ANSI colors in Windows terminal
if os.name == 'nt':
    os.system('')

CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BOLD = '\033[1m'
DIM = '\033[2m'
RESET = '\033[0m'

ROOT_DIR = Path(__file__).resolve().parent
SERVER_DIR = ROOT_DIR / "server"
CLIENT_DIR = ROOT_DIR / "client"

processes = []
shutting_down = False

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a specific network port is currently occupied."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def kill_process_tree(proc):
    """Gracefully and completely terminate a process and its child processes."""
    if not proc:
        return
    try:
        if os.name == 'nt':
            # On Windows, taskkill /F /T kills child processes (e.g. node spawned by npm)
            subprocess.run(
                f"taskkill /F /T /PID {proc.pid}",
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            proc.terminate()
            proc.wait(timeout=2)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass

def cleanup_processes(signum=None, frame=None):
    """Handle shutdown signals and kill running sub-servers cleanly."""
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    print(f"\n{YELLOW}[SHUTDOWN]{RESET} Shutting down frontend and backend servers...")
    for proc in processes:
        kill_process_tree(proc)
    print(f"{GREEN}[SHUTDOWN]{RESET} All servers stopped successfully. Goodbye!\n")
    sys.exit(0)

# Register signal handlers for clean exit
signal.signal(signal.SIGINT, cleanup_processes)
signal.signal(signal.SIGTERM, cleanup_processes)

def stream_logs(pipe, prefix, color):
    """Stream subprocess stdout/stderr line-by-line with colored service prefixes."""
    try:
        for line in iter(pipe.readline, ''):
            if shutting_down:
                break
            line_str = line.rstrip()
            if line_str:
                print(f"{color}{prefix}{RESET} {line_str}", flush=True)
    except Exception:
        pass
    finally:
        try:
            pipe.close()
        except Exception:
            pass

def check_environment():
    """Verify Node.js and npm are available and install missing dependencies if needed."""
    npm_cmd = shutil.which("npm") or shutil.which("npm.cmd")
    node_cmd = shutil.which("node") or shutil.which("node.exe")
    
    if not node_cmd or not npm_cmd:
        print(f"{RED}[ERROR]{RESET} Node.js or npm is not found in your system PATH.")
        print("Please install Node.js from https://nodejs.org/ before running this project.")
        sys.exit(1)
        
    npm_exec = "npm.cmd" if os.name == 'nt' else "npm"
    
    # Check if node_modules exist for both projects
    for folder, name in [(SERVER_DIR, "Backend"), (CLIENT_DIR, "Frontend")]:
        node_modules = folder / "node_modules"
        if not node_modules.exists():
            print(f"{YELLOW}[SETUP]{RESET} Dependencies missing for {name} ({folder.name}). Running 'npm install'...")
            subprocess.run([npm_exec, "install"], cwd=folder, shell=True, check=True)
            print(f"{GREEN}[SETUP]{RESET} {name} dependencies installed successfully!\n")

def open_browser_when_ready(url, port, timeout=15):
    """Wait until the frontend port responds, then launch the browser."""
    start = time.time()
    while time.time() - start < timeout and not shutting_down:
        if is_port_in_use(port):
            time.sleep(1.0)  # Grace period for Vite bundle readiness
            try:
                webbrowser.open(url)
            except Exception:
                pass
            return
        time.sleep(0.5)

def main():
    print(f"{CYAN}{BOLD}")
    print("=" * 62)
    print("        [ WeatherNow - Fullstack Server Runner ]        ")
    print("=" * 62)
    print(f"{RESET}", flush=True)
    
    check_environment()
    
    # Check if ports are already occupied
    if is_port_in_use(5000):
        print(f"{YELLOW}[WARNING]{RESET} Port 5000 is already in use. Backend may conflict with an existing process.", flush=True)
    if is_port_in_use(3000):
        print(f"{YELLOW}[WARNING]{RESET} Port 3000 is already in use. Vite may switch to port 3001 automatically.", flush=True)
        
    print(f"{DIM}Starting Backend (Node.js/Express) and Frontend (React/Vite)...{RESET}\n", flush=True)
    
    node_exec = shutil.which("node") or shutil.which("node.exe") or "node"
    npm_exec = "npm.cmd" if os.name == 'nt' else "npm"
    
    # 1. Start Backend Server
    server_proc = subprocess.Popen(
        [node_exec, "src/server.js"],
        cwd=SERVER_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=False,
        encoding='utf-8',
        errors='replace'
    )
    processes.append(server_proc)
    
    t_server = threading.Thread(
        target=stream_logs,
        args=(server_proc.stdout, "[BACKEND] ", CYAN),
        daemon=True
    )
    t_server.start()

    # 2. Start Frontend Client
    client_proc = subprocess.Popen(
        [npm_exec, "run", "dev"],
        cwd=CLIENT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True,
        encoding='utf-8',
        errors='replace'
    )
    processes.append(client_proc)
    
    t_client = threading.Thread(
        target=stream_logs,
        args=(client_proc.stdout, "[FRONTEND]", GREEN),
        daemon=True
    )
    t_client.start()
    
    # 3. Launch browser in the background once frontend is alive
    t_browser = threading.Thread(
        target=open_browser_when_ready,
        args=("http://localhost:3000", 3000),
        daemon=True
    )
    t_browser.start()
    
    print(f"{BOLD}{GREEN}[+] Both services are launching concurrently!{RESET}", flush=True)
    print(f"  * Frontend App:  {BOLD}http://localhost:3000{RESET}", flush=True)
    print(f"  * Admin Portal:  {BOLD}http://localhost:3000/admin{RESET}", flush=True)
    print(f"  * Backend API:   {BOLD}http://localhost:5000/api{RESET}", flush=True)
    print(f"{DIM}Press Ctrl+C anytime to cleanly stop both servers.{RESET}\n", flush=True)
    
    # Wait for processes or user interruption
    try:
        while True:
            if server_proc.poll() is not None:
                print(f"\n{RED}[BACKEND]{RESET} Backend process exited with code {server_proc.poll()}")
                break
            if client_proc.poll() is not None:
                print(f"\n{RED}[FRONTEND]{RESET} Frontend process exited with code {client_proc.poll()}")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_processes()

if __name__ == "__main__":
    main()
