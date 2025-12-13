# Almond Python Backend

## Backend E2E API Tests (Pytest)

`tests/test_api_e2e.py` is an end-to-end (E2E) test suite for the FastAPI backend.

The tests call the running backend over HTTP and verify that major user/admin flows work.

### Quick start (simplest way)

1. Make sure the backend is running

   You need a running backend you can reach from your machine.

   Default base URL used by tests:
    - `http://localhost:8000`

   If your backend is elsewhere, set `API_BASE_URL`.

2. Install pytest and requests

    ```bash
    pip install pytest requests
    ```

3. Export required environment variables

   The tests require a super admin account already existing in the database.

   Defaults are:
    - API_BASE_URL=http://localhost:8000
    - ADMIN_EMAIL=test@test.com
    - ADMIN_PASSWORD=123456

4. Run the suite

   From the backend root:

    ```bash
    pytest -q tests/test_api_e2e.py
    ```

   You should see all tests pass (some may be skipped if marked optional).

5. Common notes / troubleshooting

   Admin login fails (401/403)
    - Ensure the admin user exists in DB.
    - Ensure the email/password you exported match that user.
    - Check backend .env / seed scripts.

   Connection errors
    - Backend not running or wrong port.
    - Check with:

   curl http://localhost:8000/health

   Streaming test hangs
    - The suite reads just a few SSE events and exits.

   If it hangs, check:
    - mock LLM server running
    - /messages/stream endpoint enabled
    - reverse proxy buffering disabled (if any)

### Optional: run tests inside Docker

If your stack is already running via Docker Compose, you can run tests inside the backend container.

1. Enter the backend container

    ```bash
    docker compose exec backend bash


2. Run

    ```bash
    pytest -q tests/test_api_e2e.py
    ```

That’s it — if the backend is up and env vars are correct, you’re good to go.

## Configuring Ollama

The chat endpoints now call an Ollama server instead of the mock LLM. You can configure the connection with environment variables:

- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `qwen3:4b`)
- `OLLAMA_TIMEOUT` (default: `60.0` seconds)
- `OLLAMA_OPTIONS_JSON` (optional JSON string passed to Ollama `options`, e.g. `{ "temperature": 0.6, "top_p": 0.9, "seed": 42, "reasoning": true }`)

Example `.env` snippet:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_OPTIONS_JSON={"reasoning":true,"temperature":0.6}
```

Make sure your Ollama daemon is running and the model has been pulled (`ollama pull qwen3:4b`). If you are using reasoning-capable models (e.g., qwen3:4b), enabling `reasoning` in `OLLAMA_OPTIONS_JSON` allows the backend to surface the model's thinking stream to clients.
