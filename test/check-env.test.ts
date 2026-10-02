import { describe, expect, it } from "vitest";
import { checkEnvironment, parseContract } from "../src/check-env/index.mjs";

const EXAMPLE = `# Public origin. REQUIRED
APP_URL=

# Optional
PORT=3000

# --- Auth
# REQUIRED: 32+ chars
BETTER_AUTH_SECRET=replace-me
GOOGLE_CLIENT_ID=
`;

describe("parseContract", () => {
    it("marks only the key directly under a REQUIRED comment block", () => {
        expect(parseContract(EXAMPLE)).toEqual({
            required: ["APP_URL", "BETTER_AUTH_SECRET"],
            optional: ["PORT", "GOOGLE_CLIENT_ID"],
        });
    });
});

describe("checkEnvironment", () => {
    it("reports missing and placeholder values", () => {
        const result = checkEnvironment(parseContract(EXAMPLE), {
            BETTER_AUTH_SECRET: "replace-me",
            PORT: "3000",
        });
        expect(result.missing).toEqual(["APP_URL"]);
        expect(result.placeheld).toEqual(["BETTER_AUTH_SECRET"]);
        expect(result.optionalSet).toBe(1);
    });

    it("adds production-only requirements", () => {
        const result = checkEnvironment(
            parseContract(EXAMPLE),
            { APP_URL: "https://a.com", BETTER_AUTH_SECRET: "x".repeat(32) },
            ["RESEND_API_KEY"],
        );
        expect(result.missing).toEqual(["RESEND_API_KEY"]);
    });
});
