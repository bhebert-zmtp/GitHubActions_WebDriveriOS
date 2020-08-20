"use strict";

import fetch from "node-fetch";
import { spawn } from "child_process";
import net from "net";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function GetFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer((socket) => {
			console.log(socket);
		});

		server.listen(0, "0.0.0.0", () => {
			const addr = server.address();
			if (typeof addr === "string" || addr === null) {
				reject("Invalid address");
			} else {
				resolve(addr.port);
			}

			server.close();
		});
	});
}

async function StartService(port: number) {
	const executable_path = "/usr/bin/safaridriver";
	const proc = spawn(executable_path, ["--port", port.toString()], {
		env: process.env,
		stdio: "ignore",
	});

	// This process should not wait on the spawned child, however, we do
	// want to ensure the child is killed when this process exits.
	proc.unref();
	process.once("exit", onProcessExit);

	proc.once("exit", (code, signal) => {
		process.removeListener("exit", onProcessExit);
	});

	function onProcessExit() {
		killCommand("SIGTERM");
	}

	function killCommand(signal: NodeJS.Signals | number) {
		process.removeListener("exit", onProcessExit);
		if (proc) {
			proc.kill(signal);
		}
	}

	console.log(`Service running on port ${port}`);
	return proc;
}

async function CreateSession(server_addr: string, port: number) {
	const body = {
		capabilities: {
			alwaysMatch: {
				platformName: "iOS",
				"safari:useSimulator": true,
				"safari:deviceType": "iPhone",
			},
		},
	};

	console.log("Creating session...");
	const res = await fetch(`${server_addr}:${port}/session`, {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});

	const obj = await res.json();

	console.log("Session created:");
	console.log(JSON.stringify(obj, null, 4));
}

(async () => {
	const port = await GetFreePort();
	const service = await StartService(port);

	// Wait for the service to start up all the way
	await sleep(1000);

	await CreateSession("http://localhost", port);
	await sleep(1000);
	await service.kill();
})();
