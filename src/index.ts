"use strict";

import fetch from "node-fetch";
import { spawn } from "child_process";
import net from "net";
import http from "http";

const capabilities = {
	platformName: "iOS",
	"safari:useSimulator": true,
	"safari:deviceType": "iPhone",
};

/*
{
	browserName: "Safari", // per safaridriver man page
	platformName: "iOS", // per safaridriver man page
	"safari:platformVersion": "13.6",
	"safari:useSimulator": true,
	"safari:deviceType": "iPhone",
}
*/

/**
 * zzz
 * @param ms
 */
function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets a free port number for later use
 */
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

/**
 * Starts the safaridriver service on the specified port
 * @param port Target port
 */
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

/**
 * Example function to create a webdriver session using the specified information. Uses node-fetch.
 * @param server_addr
 * @param port
 */
async function CreateSession(server_addr: string, port: number) {
	const body = {
		capabilities: {
			alwaysMatch: capabilities,
		},
	};

	console.log("Creating session...");
	const res = await fetch(`${server_addr}:${port}/session`, {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});

    if (res.status !== 200){
        throw new Error("Unable to start session");
    }

	const obj = await res.json();

	console.log("Session created:");
	console.log(JSON.stringify(obj, null, 4));
}

/**
 * Barebones test function for creating a session using the specified info.
 * Requires no non-standard dependencies.
 * @param port
 */
async function CreateSessionBarebones(port: number) {
	const data = JSON.stringify({
		capabilities: {
			alwaysMatch: capabilities,
		},
	});

	const options: http.RequestOptions = {
		hostname: "localhost",
		protocol: "http:",
		port: port,
		path: "/session",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": data.length,
		},
	};

	const req = http.request(options, (res) => {
		console.log(`statusCode: ${res.statusCode} ${res.statusMessage}`);

		res.on("data", (d: Buffer) => {
			const sessionInfo = JSON.parse(d.toString());
			console.log(JSON.stringify(sessionInfo, null, 4));
		});

		res.on("end", () => {
			if (res.statusCode !== 200) {
				throw new Error("Unable to start session");
			}
		});
	});

	req.on("error", (error) => {
		console.error(error);
	});

	req.write(data);
	req.end();
}

(async (barebones: boolean) => {
	const port = await GetFreePort();
	const service = await StartService(port);

	// Wait for the service to start up all the way
	await sleep(1000);

	if (barebones) {
		CreateSessionBarebones(port);
		return;
	}

	await CreateSession("http://localhost", port);
	await sleep(1000);
	await service.kill();
})(true);
