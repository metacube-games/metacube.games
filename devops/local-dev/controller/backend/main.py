"""Controller backend — FastAPI + python-socketio (AsyncServer).

The controller exposes:
  - Socket.IO events (`action` in, `init`/`event`/`output` out) used by the
    web UI to start/stop the local-dev module subprocesses.
  - REST endpoints under /admin/* for the DatabaseAdmin tab.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import socketio
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin import create_pool, router as admin_router
from workers import ModuleManager, compute_transitions, load_modules

load_dotenv(dotenv_path=Path("/env/.env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

modules = load_modules()
for name in modules:
    logger.info("Loaded module %s", name)
transitions = compute_transitions(modules)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=os.getenv("CONTROLLER_CORS_ORIGIN", "*"),
)
manager = ModuleManager(modules, sio)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_pool = create_pool()
    await manager.start()
    try:
        yield
    finally:
        await manager.shutdown()
        await app.state.db_pool.close()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(admin_router)

# Wrap FastAPI in the Socket.IO ASGI app so both share the same port.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)


@sio.event
async def connect(sid: str, environ: dict):
    logger.info("Connection from %s", sid)
    await sio.emit(
        "init",
        {"states": manager.snapshot_states(), "transitions": transitions},
        to=sid,
    )


@sio.event
async def disconnect(sid: str):
    logger.info("Disconnection from %s", sid)


@sio.on("action")
async def on_action(sid: str, data: dict):
    """Expected: {"module": str, "action": str}.

    Errors are emitted as `event` with status="error" to the sender; on
    success the worker emits broadcasts as it transitions states.
    """
    logger.info("[%s] Received action %s", sid, data)
    module = data.get("module")
    action = data.get("action")

    if module not in modules:
        logger.error("[%s] Module %s not found", sid, module)
        await sio.emit(
            "event",
            {
                "module": module,
                "action": action,
                "status": "error",
                "message": "Module not found",
            },
            to=sid,
        )
        return

    if action not in modules[module]["actions"]:
        logger.error(
            "[%s] Action %s not found for module %s", sid, action, module
        )
        await sio.emit(
            "event",
            {
                "module": module,
                "action": action,
                "status": "error",
                "message": "Action not found",
            },
            to=sid,
        )
        return

    await manager.enqueue(module, action, sid)


def main():
    port = int(os.getenv("CONTROLLER_BACKEND_PORT", "5000"))
    ssl_crt = os.getenv("SSL_CRT_FILE")
    ssl_key = os.getenv("SSL_KEY_FILE")
    uvicorn.run(
        asgi_app,
        host="0.0.0.0",
        port=port,
        ssl_certfile=ssl_crt,
        ssl_keyfile=ssl_key,
    )


if __name__ == "__main__":
    main()
