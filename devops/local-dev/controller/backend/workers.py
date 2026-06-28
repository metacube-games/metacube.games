"""Per-module async workers driving subprocess actions for the local-dev rig.

Each module gets one worker task and an asyncio.Queue. Actions are pulled in
order; long-running actions (start/build/...) are launched as subprocesses
whose stdout is streamed to the frontend as `output` socket events. The
`stop` action terminates the running subprocess.
"""

import asyncio
import logging
import os
import signal
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)


def load_modules(path: str = "./modules.yml") -> dict:
    with open(path) as f:
        return yaml.safe_load(f)["modules"]


def compute_transitions(modules: dict) -> dict:
    """For each module, group actions by their required current state."""
    transitions: dict[str, dict[str, list[str]]] = {}
    for module, module_data in modules.items():
        transitions[module] = {}
        for action, action_data in module_data["actions"].items():
            curr = action_data["curr-state"]
            transitions[module].setdefault(curr, []).append(action)
    return transitions


class ModuleManager:
    """Coordinates all module workers and broadcasts state via socket.io."""

    def __init__(self, modules: dict, sio):
        self.modules = modules
        self.sio = sio
        self.states: dict[str, str] = {m: "idle" for m in modules}
        self.processes: dict[str, asyncio.subprocess.Process | None] = {
            m: None for m in modules
        }
        self.queues: dict[str, asyncio.Queue] = {m: asyncio.Queue() for m in modules}
        self.workers: list[asyncio.Task] = []
        # Modules currently being stopped — the monitor task checks this so
        # it doesn't emit a spurious error event when SIGTERM causes the
        # subprocess to exit with a non-zero status. _stop owns the final
        # state transition for these.
        self.stopping: set[str] = set()

    async def start(self):
        for module, module_data in self.modules.items():
            task = asyncio.create_task(
                self._worker(module, module_data),
                name=f"worker:{module}",
            )
            self.workers.append(task)

    async def shutdown(self):
        for task in self.workers:
            task.cancel()
        for module, proc in self.processes.items():
            if proc and proc.returncode is None:
                logger.info("Terminating running subprocess for %s", module)
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except ProcessLookupError:
                    pass
        # Give workers a moment to wind down their cancellations
        await asyncio.gather(*self.workers, return_exceptions=True)

    def snapshot_states(self) -> dict[str, str]:
        return dict(self.states)

    async def enqueue(self, module: str, action: str, sid: str):
        await self.queues[module].put({"action": action, "sid": sid})

    async def _emit_event(
        self,
        module: str,
        action: str,
        status: str,
        new_state: str,
        message: str | None = None,
    ):
        self.states[module] = new_state
        await self.sio.emit(
            "event",
            {
                "module": module,
                "action": action,
                "status": status,
                "message": message,
                "states": self.snapshot_states(),
            },
        )

    async def _emit_error_to(
        self, sid: str, module: str, action: str, message: str
    ):
        await self.sio.emit(
            "event",
            {
                "module": module,
                "action": action,
                "status": "error",
                "message": message,
            },
            to=sid,
        )

    async def _worker(self, module_name: str, module_data: dict):
        logger.info("Started worker for module %s", module_name)
        queue = self.queues[module_name]
        try:
            while True:
                action_payload = await queue.get()
                await self._handle_action(module_name, module_data, action_payload)
        except asyncio.CancelledError:
            logger.info("Worker %s cancelled", module_name)
            raise

    async def _handle_action(
        self, module_name: str, module_data: dict, payload: dict
    ):
        action = payload["action"]
        sid = payload["sid"]
        action_data = module_data["actions"][action]
        curr_state = self.states[module_name]

        if action_data["curr-state"] != curr_state:
            await self._emit_error_to(
                sid,
                module_name,
                action,
                f"Action not allowed in current state {curr_state}",
            )
            return

        await self._emit_event(
            module_name, action, "success", action_data["transition-state"]
        )

        command = action_data["command"]

        if action == "stop":
            await self._stop(module_name, action, action_data, command)
            return

        if self.processes.get(module_name):
            await self._emit_event(
                module_name,
                action,
                "error",
                action_data["curr-state"],
                "An action is already being executed",
            )
            return

        proc = await self._spawn(module_name, command)
        self.processes[module_name] = proc

        # 'start' transitions immediately; other actions wait for the
        # process to finish (see _monitor).
        if action == "start":
            await self._emit_event(
                module_name, action, "success", action_data["next-state"]
            )

        asyncio.create_task(
            self._monitor(module_name, action, action_data, proc),
            name=f"monitor:{module_name}:{action}",
        )

    async def _spawn(
        self, module_name: str, command: str
    ) -> asyncio.subprocess.Process:
        return await asyncio.create_subprocess_shell(
            f"docker exec -i {module_name} {command}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            start_new_session=True,
        )

    async def _stop(
        self, module_name: str, action: str, action_data: dict, command: str
    ):
        running = self.processes.get(module_name)
        if not running:
            await self._emit_event(
                module_name,
                action,
                "error",
                action_data["next-state"],
                "Module is not running",
            )
            return

        # Mark before SIGTERM so the concurrently-running _monitor task
        # treats the subsequent non-zero exit as expected.
        self.stopping.add(module_name)
        try:
            # Terminate the running process group, then run the in-container
            # `command` (typically `pkill -f make`) and wait for it to finish.
            try:
                os.killpg(os.getpgid(running.pid), signal.SIGTERM)
            except ProcessLookupError:
                pass

            killer = await asyncio.create_subprocess_shell(
                f"docker exec -i {module_name} {command}",
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
                start_new_session=True,
            )
            await killer.wait()

            # Wait for the running process to actually exit
            await running.wait()
            self.processes[module_name] = None
        finally:
            self.stopping.discard(module_name)

        await self._emit_event(
            module_name, action, "success", action_data["next-state"]
        )

    async def _monitor(
        self,
        module_name: str,
        action: str,
        action_data: dict,
        proc: asyncio.subprocess.Process,
    ):
        assert proc.stdout is not None
        async for raw in proc.stdout:
            line = raw.decode(errors="replace").strip()
            if not line:
                continue
            await self.sio.emit(
                "output",
                {"module": module_name, "action": action, "output": line},
            )

        await proc.wait()

        if self.processes.get(module_name) is proc:
            self.processes[module_name] = None

        # If a concurrent _stop is in progress, it owns the final state
        # transition — don't overwrite it with a SIGTERM-induced error.
        if module_name in self.stopping:
            return

        if proc.returncode != 0:
            logger.error("Process for %s returned %d", module_name, proc.returncode)
            await self._emit_event(
                module_name,
                action,
                "error",
                action_data["curr-state"],
                "Process returned non-zero exit code",
            )
        elif action != "start":
            await self._emit_event(
                module_name, action, "success", action_data["next-state"]
            )
