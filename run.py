"""One-command bootstrap and launcher for the engineering drawing agent."""
from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

MIN_PYTHON = (3, 10)
ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = ROOT / ".venv"
REQUIREMENTS = BACKEND / "requirements.txt"
STAMP = VENV / ".agent-ready"
CADQUERY_SPEC = "cadquery==2.8.0"

FRONTEND_ASSETS = (
    "preact/dist/preact.mjs",
    "preact/hooks/dist/hooks.mjs",
    "htm/dist/htm.module.js",
    "three/build/three.module.js",
)


def _venv_python() -> Path:
    if os.name == "nt":
        return VENV / "Scripts" / "python.exe"
    return VENV / "bin" / "python"


def _run_streaming(cmd: list[str], *, cwd: Path = ROOT) -> tuple[int, str]:
    print("  $ " + " ".join(cmd), flush=True)
    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    lines: list[str] = []
    assert process.stdout is not None
    for line in process.stdout:
        print(line, end="", flush=True)
        lines.append(line)
        if len(lines) > 120:
            lines.pop(0)
    return process.wait(), "".join(lines)


def _install_args(*, lite: bool, reinstall: bool) -> list[str]:
    args = [
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--progress-bar",
        "off",
        "-r",
        str(REQUIREMENTS),
    ]
    if not lite:
        args.append(CADQUERY_SPEC)
    if reinstall:
        args.insert(3, "--upgrade")
    return args


def _run_pip(args: list[str]) -> None:
    code, output = _run_streaming([str(_venv_python()), *args], cwd=BACKEND)
    if code == 0:
        return

    if "CERTIFICATE_VERIFY_FAILED" in output or "SSL: CERTIFICATE_VERIFY_FAILED" in output:
        print("\n  TLS certificate verification failed; retrying with PyPI trusted hosts.", flush=True)
        retry = [
            args[0],
            args[1],
            args[2],
            "--trusted-host",
            "pypi.org",
            "--trusted-host",
            "files.pythonhosted.org",
            *args[3:],
        ]
        code, _ = _run_streaming([str(_venv_python()), *retry], cwd=BACKEND)
        if code == 0:
            return
    raise RuntimeError("Python dependency installation failed")


def _requirements_key(*, lite: bool) -> str:
    digest = hashlib.sha256(REQUIREMENTS.read_bytes()).hexdigest()
    return f"{sys.version_info.major}.{sys.version_info.minor}:{digest}:lite={lite}"


def prepare_backend(*, lite: bool, reinstall: bool) -> None:
    if sys.version_info < MIN_PYTHON:
        raise RuntimeError(
            f"Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ is required; "
            f"current version is {sys.version.split()[0]}"
        )

    python = _venv_python()
    if not python.exists():
        print(f"[2/4] Creating virtual environment: {VENV}", flush=True)
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV)])
    else:
        print(f"[2/4] Backend virtual environment: {VENV}", flush=True)

    key = _requirements_key(lite=lite)
    installed = STAMP.exists() and STAMP.read_text(encoding="utf-8").strip() == key
    if installed and not reinstall:
        print("      Backend dependencies are ready.", flush=True)
        return

    print("      Installing backend dependencies. First run may take several minutes.", flush=True)
    _run_pip(_install_args(lite=lite, reinstall=reinstall))

    check = (
        "import fastapi, uvicorn, pydantic, networkx, multipart, cv2, fitz; "
        "print('backend imports ok')"
    )
    subprocess.check_call([str(python), "-c", check], cwd=BACKEND)
    STAMP.write_text(key, encoding="utf-8")


def prepare_frontend(*, reinstall: bool) -> None:
    missing = [
        item for item in FRONTEND_ASSETS if not (FRONTEND / "node_modules" / item).exists()
    ]
    if not missing and not reinstall:
        print("[3/4] Frontend dependencies are ready.", flush=True)
        return

    npm = shutil.which("npm")
    if not npm and os.name == "nt":
        npm = shutil.which("npm.cmd")
    if not npm:
        candidates = (
            Path("/opt/homebrew/bin/npm"),
            Path("/usr/local/bin/npm"),
            Path(os.environ.get("ProgramFiles", "")) / "nodejs" / "npm.cmd",
        )
        npm = next((str(path) for path in candidates if path.is_file()), None)
    if not npm:
        raise RuntimeError(
            "Node.js/npm is required for the web interface. "
            "Install Node.js 18+ and run the script again."
        )

    print("[3/4] Installing frontend dependencies.", flush=True)
    command = [npm, "ci", "--no-audit", "--no-fund"]
    if not (FRONTEND / "package-lock.json").exists():
        command = [npm, "install", "--no-audit", "--no-fund"]
    subprocess.check_call(command, cwd=FRONTEND)


def ensure_port_available(port: int) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(
                f"Port {port} is already in use. Start with --port <another-port>."
            )


def wait_for_server(process: subprocess.Popen, port: int, timeout: float = 60.0) -> None:
    url = f"http://127.0.0.1:{port}/api/health"
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Server exited with code {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=1.0) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            pass
        time.sleep(0.25)
    raise RuntimeError(f"Server did not become ready within {timeout:.0f} seconds")


def launch(*, port: int, open_browser: bool) -> int:
    ensure_port_available(port)
    environment = os.environ.copy()
    environment["PORT"] = str(port)
    environment["PYTHONUNBUFFERED"] = "1"

    print(f"[4/4] Starting server on http://127.0.0.1:{port}", flush=True)
    process = subprocess.Popen(
        [str(_venv_python()), str(BACKEND / "serve.py")],
        cwd=ROOT,
        env=environment,
    )
    try:
        wait_for_server(process, port)
        print(f"\nReady: http://127.0.0.1:{port}\nPress Ctrl+C to stop.\n", flush=True)
        if open_browser:
            webbrowser.open(f"http://127.0.0.1:{port}")
        return process.wait()
    except KeyboardInterrupt:
        print("\nStopping server...", flush=True)
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        return 0
    finally:
        if process.poll() is None:
            process.terminate()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Install and run the engineering drawing agent.")
    parser.add_argument("--port", type=int, default=8000, help="HTTP port (default: 8000)")
    parser.add_argument(
        "--lite",
        action="store_true",
        help="Skip CadQuery/OpenCASCADE; STEP/STL export will be unavailable",
    )
    parser.add_argument("--reinstall", action="store_true", help="Reinstall all dependencies")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser")
    parser.add_argument("--check-only", action="store_true", help="Prepare dependencies and exit")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    return args


def main() -> int:
    args = parse_args()
    print("[1/4] Engineering Drawing Agent bootstrap", flush=True)
    try:
        prepare_backend(lite=args.lite, reinstall=args.reinstall)
        prepare_frontend(reinstall=args.reinstall)
        if args.check_only:
            print("\nEnvironment is ready.", flush=True)
            return 0
        return launch(port=args.port, open_browser=not args.no_browser)
    except (RuntimeError, OSError, subprocess.CalledProcessError) as exc:
        print(f"\nStartup failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
