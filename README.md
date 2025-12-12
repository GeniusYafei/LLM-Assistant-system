# Lorgan LLM Chat App — Installation & Docker Guide

This guide explains how to set up, run, stop, and fully remove the project using Docker Compose.

---

## Prerequisites

Make sure you have installed:

- **Git**
- **Docker Desktop** (includes Docker Engine + Docker Compose)
- **OpenSSL** (usually preinstalled on macOS/Linux; Windows users can use Git Bash or WSL)

## Installation & Setup Steps

1. Clone the Repository

    ```bash
    git clone <GITHUB_REPO_URL>
    cd <REPO_FOLDER>
    ```

2. Create Local .env Files

   Copy example env files:

    ```bash
    cp frontend/.env.example frontend/.env
    cp backend/.env.example backend/.env
    ```

3. Generate and Set Backend SECRET_KEY

   Generate a secure key:

    ```bash
    openssl rand -hex 32
    ```

   Copy the output and paste it into backend/.env:

    ```text
    SECRET_KEY=<PASTE_GENERATED_KEY_HERE>
    ```

   Make sure the key is a single line with no quotes.

4. Start the App (First Time)

   The first run must build images:

    ```bash
    docker compose up --build
    ```

    This will start all services defined in docker-compose.yml, typically:

    - backend (FastAPI)
    - frontend (React)
    - mock-llm (Mock LLM server)
    
    After startup:

    - Frontend: http://localhost:9900
    - Backend API: http://localhost:8000
    - Backend docs (Swagger): http://localhost:8000/docs

5. Start the App (After First Time)

    No rebuild needed unless code/deps changed:
    
    ```bash
    docker compose up
    # docker compose up -d
    ```

6. Stop Containers (Keep Data)

    Stops all running containers but preserves volumes and images:

    ```bash
    docker compose down
    ```

7. Stop Containers + Remove Containers (Keep Volumes)

    Same as above (default behavior):
    
    ```bash
    docker compose down
    ```

8. ⚠️ Stop Containers + Remove Volumes (DELETE ALL DATA)

    ```bash
    docker compose down -v
    ```

9. Full Cleanup (Containers + Volumes + Images)

    If you want a completely fresh reinstall:

    ```bash
    docker compose down -v --rmi all
    ```
