import uvicorn

from app import config

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.UVICORN_RELOAD,
        reload_excludes=config.UVICORN_RELOAD_EXCLUDES,
    )