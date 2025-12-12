# Frontend (React + Vite + Tailwind CSS)

## Environment variables (.env)

- Commit **`frontend/.env.example`** to the repo. It lists required variables with sample values.
- **Do not commit `.env`**. It’s environment-specific and may contain sensitive data.
- After cloning, each developer should run:
  ```bash
  cp frontend/.env.example frontend/.env
  ```
- Only variables prefixed with VITE_ are exposed to the client (via import.meta.env).

  Example:

    ```env
    VITE_API_BASE_URL=http://localhost:8000
    VITE_APP_NAME=Lorgan GPT
    ```
  
## How to Run?

Run in the root directory of the repository:

```bash
# Start the services
docker compose up
# or: docker-compose up -d  # to run in detached mode

# Stop the services
docker compose down
```

## Catalog description

src/assets/: Static assets like images and fonts.

src/components/: Reusable React components.

src/pages/: Different pages of the application.

src/lib/: Tool libraries and API wrappers (fetch/WebSocket/streaming, etc.).

src/hooks/: Custom React hooks (switch themes, etc.).

src/constants/: Constant definitions (topic token, key name, routing constants, etc.).

## NPM usage inside Docker

### A. The service container is not running

```bash
# Install a package (e.g., react-router-dom)
docker run --rm -it -v "$PWD/frontend":/app -w /app node:22-alpine sh -lc "
set -e
npm i [the-package-you-want-to-install]
npm ls [the-package-you-want-to-install]
"

# Commit the lockfile changes
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): update deps [the-package-you-want-to-install]"
git push
```

### B. The service container is running

```bash
# Install
docker compose exec frontend sh -lc "npm i <pkg> && npm ls <pkg>"

# Uninstall
docker compose exec frontend sh -lc "npm un <pkg> && npm ls"

# Commit lockfile changes
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): update deps [pkg]"
git push
```

### Teammates sync to the latest dependencies (*‼️IMPORTANT**)

```bash
git pull

docker compose down -v

docker compose up --build
```



# ✅ Testing Strategy (Frontend)

This section documents the frontend test coverage, testing tools, and instructions required for COMP[39]900 Software Quality Assessment.
It explains our approach to component testing, mocking, and integration tests, and provides clear steps for running the test suite.

## 📌 Overview

The frontend test suite is implemented using:

* Vitest — Fast Vite-compatible test runner
* @testing-library/react — Component behavior & DOM interaction testing
* jsdom — Browser-like simulated DOM
* Mocking utilities — For isolating components and external dependencies

Our goal is to ensure correctness of key UI behavior, robust user interaction handling, and reliable integration between components.

## 📁 Test File Location

All test files are stored under:

```bash
frontend/src/tests/
```

Including:
* DashboardPage.test.jsx
* ChatSidebar.test.jsx
* DocumentsPage.test.jsx
* LoginPage.test.jsx
* SignupPage.test.jsx
* ForgotPasswordPage.test.jsx
* MessageInput.test.jsx
* setupTests.js (global configuration)

These files cover page-level components, core reusable components, and complex UI interaction flows.

## 📦 Required Dependencies

Ensure the following testing libraries are installed (already included in package.json):

```njinx
vitest
@testing-library/react
@testing-library/jest-dom
jsdom
```

If needed:

```bash
cd frontend
npm install
```

## 🧪 What We Test
### 1. Rendering & Layout
We verify that each page renders the correct structure:

* Page headers and titles
* Buttons, inputs, dropdowns
* Sidebars and navigation components

Example:

* Dashboard displays Quick Actions when an organization is selected
* DocumentsPage shows accurate file counts and sizes

### 2. User Interaction
We simulate real user behavior:

* Typing into inputs
* Clicking buttons
* Switching organizations
* Uploading files (mocked)
* Opening and closing UI elements

Example:

* Signup form enables the "Sign Up" button only after all validation passes
* MessageInput handles Enter key, file attachments, and voice toggle clicks

### 3. Mocking External Components

Some components rely on logic outside the page (e.g., OrganizationSelector, MessageList, DocumentUpload).
To ensure reliability, we mock:

* API calls
* Organization selector
* Document uploader
* Conversation sidebar

This isolates UI logic from external dependencies.

### 4. Sad-Case Testing
We include negative-path tests, including:

* Missing user input
* Disabled upload state
* Empty conversation history
* No analytics data available

This ensures stability under edge-case conditions.

## ▶️ Running Tests

Run all frontend tests:
```bash
cd frontend
npm run test
```
Run a single test file:
```bash
npx vitest run src/tests/DashboardPage.test.jsx
```

### 🏗️Test Environment Setup
The project uses a global test setup file:
```bash
frontend/src/setupTests.js
```

## ✔️ Summary of Frontend Testing Quality
Our testing demonstrates:
### ✅ Breadth
* All major pages have dedicated test files
* Core shared components are tested
* Both happy and sad paths covered
### ✅ Robustness
* Mocking isolates components from external dependencies
* Interaction tests simulate real user flows
* UI logic is validated thoroughly
### ✅ Completeness
* Functional correctness
* Robust UI behavior
* Clear testing documentation
* High maintainability