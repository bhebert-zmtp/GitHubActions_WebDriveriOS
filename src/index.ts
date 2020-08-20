"use strict";

import http from "http";

(async () => {
	const data = JSON.stringify({
		capabilities: {
            alwaysMatch: {
                browserName: "Safari",  // per safaridriver man page
                platformName: "iOS",    // per safaridriver man page
                "safari:platformVersion": "13.6",
                "safari:useSimulator": true,
			    "safari:deviceType": "iPhone",
            },
            firstMatch: []
        }
	});

	const options = {
		hostname: "localhost",
		port: 8080,
		path: "/session",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Content-Length": data.length,
		},
	};

	const req = http.request(options, (res) => {
		console.log(`statusCode: ${res.statusCode} ${res.statusMessage}`);

		res.on("data", (d) => {
			process.stdout.write(d);
		});
	});

	req.on("error", (error) => {
		console.error(error);
	});

	req.write(data);
	req.end();
})();
