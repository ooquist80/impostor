from fastapi import FastAPI

from app.routes import auth, games, join, words

# No CORS: the browser reaches the API only through the Vite proxy or Caddy.
app = FastAPI(
    title="Impostor",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

for module in (words, auth, join, games):
    app.include_router(module.router)
