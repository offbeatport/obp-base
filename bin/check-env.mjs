#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkEnvironment, parseContract } from "../src/check-env/index.mjs";

function run() {
    const { values } = parseArgs({
        options: {
            app: { type: "string", default: "The app" },
            root: { type: "string", default: process.cwd() },
            "require-in-production": { type: "string", default: "" },
        },
    });
    const root = path.resolve(values.root);
    const examplePath = path.join(root, ".env.example");

    try {
        process.loadEnvFile(path.join(root, ".env"));
    } catch {}

    if (!existsSync(examplePath)) {
        console.error("[env] .env.example is missing; cannot tell what is required.");
        process.exit(1);
    }

    const productionOnly =
        process.env.NODE_ENV === "production"
            ? values["require-in-production"]
                  .split(",")
                  .map((name) => name.trim())
                  .filter(Boolean)
            : [];
    const contract = parseContract(readFileSync(examplePath, "utf8"));
    const result = checkEnvironment(contract, process.env, productionOnly);

    if (result.missing.length === 0 && result.placeheld.length === 0) {
        console.log(
            `[env] ok: ${result.required.length} required present, ${result.optionalSet}/${contract.optional.length} optional set`,
        );
        process.exit(0);
    }

    const pad = (name = "") => name.padEnd(30);
    console.error(`\n  ${values.app} cannot start: the environment is not configured.\n`);
    for (const name of result.missing) console.error(`    ${pad(name)} is not set`);
    for (const name of result.placeheld) {
        console.error(`    ${pad(name)} still holds the .env.example placeholder`);
    }
    console.error("\n  Copy .env.example to .env, or set these on the container.\n");
    process.exit(1);
}

run();
