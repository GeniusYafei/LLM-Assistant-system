# backend/app/main.py
from textwrap import dedent

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.core.config import settings
from app.routers import account, admin, analytics, auth, chat, files, passwd_reset, quota

app = FastAPI(title=settings.APP_NAME, docs_url=None)

# CORS
origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


CUSTOM_DOCS_HTML = dedent(
    """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>__APP_NAME__ · API Docs</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #0b1021; color: #e8edff; }
        header { background: linear-gradient(120deg, #3b82f6, #22c55e); color: #fff; padding: 24px; }
        h1 { margin: 0 0 4px 0; font-size: 24px; }
        p.subtitle { margin: 0; opacity: 0.9; }
        main { padding: 20px; }
        .endpoint { background: #11162f; border: 1px solid #1f2a4d; border-radius: 10px; margin-bottom: 14px; padding: 14px 16px; box-shadow: 0 6px 18px rgba(0,0,0,0.25); }
        .method { display: inline-block; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-right: 10px; color: #0b1021; }
        .GET { background: #4ade80; }
        .POST { background: #60a5fa; }
        .PUT { background: #f59e0b; }
        .DELETE { background: #f43f5e; }
        details summary { cursor: pointer; outline: none; }
        code { background: #0f172a; color: #a5b4fc; padding: 2px 4px; border-radius: 4px; }
        .empty { opacity: 0.75; }
      </style>
    </head>
    <body>
      <header>
        <h1>__APP_NAME__ API</h1>
        <p class="subtitle">轻量级内置文档，无需外网依赖。OpenAPI: <code>/openapi.json</code></p>
      </header>
      <main>
        <div id="content">Loading OpenAPI schema...</div>
      </main>
    <script>
    async function renderDocs() {
      const container = document.getElementById('content');
      try {
        const res = await fetch('/openapi.json');
        if (!res.ok) throw new Error('无法获取 OpenAPI: ' + res.status);
        const spec = await res.json();
        const paths = spec.paths || {};
        const entries = Object.entries(paths);
        if (!entries.length) {
          container.innerHTML = '<p class="empty">未发现可用的 API 路径。</p>';
          return;
        }
        container.innerHTML = '';
        for (const [path, methods] of entries) {
          for (const [method, info] of Object.entries(methods)) {
            const box = document.createElement('details');
            box.className = 'endpoint';
            const summary = document.createElement('summary');
            const badge = document.createElement('span');
            badge.className = 'method ' + method.toUpperCase();
            badge.textContent = method.toUpperCase();
            summary.appendChild(badge);
            const title = document.createElement('span');
            title.textContent = ` ${path} — ${info.summary || info.operationId || '未命名操作'}`;
            summary.appendChild(title);
            box.appendChild(summary);
            const desc = document.createElement('p');
            desc.textContent = info.description || '暂无描述';
            box.appendChild(desc);
            if (info.parameters && info.parameters.length) {
              const params = document.createElement('div');
              params.innerHTML = '<strong>参数：</strong>';
              const list = document.createElement('ul');
              for (const p of info.parameters) {
                const li = document.createElement('li');
                li.innerHTML = `<code>${p.name}</code> (${p.in}) - ${p.description || '无描述'}`;
                list.appendChild(li);
              }
              params.appendChild(list);
              box.appendChild(params);
            }
            const consume = info.requestBody ? 'Request body: ' + Object.keys(info.requestBody.content || {}).join(', ') : 'No body';
            const produce = '返回: ' + Object.keys((info.responses && info.responses['200'] && info.responses['200'].content) || {}).join(', ');
            const meta = document.createElement('p');
            meta.innerHTML = `<em>${consume}</em><br><em>${produce}</em>`;
            box.appendChild(meta);
            container.appendChild(box);
          }
        }
      } catch (err) {
        container.innerHTML = `<p class="empty">加载失败：${err}</p>`;
      }
    }
    renderDocs();
    </script>
    </body>
    </html>
    """
)

# Route
app.include_router(auth.router, prefix="/api/v1")
app.include_router(passwd_reset.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(quota.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(account.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


# Health check endpoint
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


@app.get("/docs", include_in_schema=False)
async def custom_docs() -> HTMLResponse:
    return HTMLResponse(CUSTOM_DOCS_HTML.replace("__APP_NAME__", settings.APP_NAME))
