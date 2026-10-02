import { describe, expect, it } from "vitest";
import { z } from "zod";
import { url, defineEnv, emailList, flag, intIn, isConfigured } from "../src/env/index";

const schema = z.object({
    APP_URL: url("APP_URL"),
    PORT: intIn("PORT", 1, 65535).default(3000),
    BILLING: flag("false"),
    ADMIN_EMAILS: emailList(),
});

function setup(source: Record<string, string | undefined>) {
    return defineEnv({
        app: "Test",
        schema,
        source: () => source,
        derive: (parsed) => ({ ...parsed, isLocal: parsed.APP_URL.includes("localhost") }),
    });
}

describe("defineEnv", () => {
    it("parses, transforms and derives lazily", () => {
        const { env } = setup({
            APP_URL: "http://localhost:3000/",
            ADMIN_EMAILS: " A@x.com,b@x.com",
        });
        expect(env.APP_URL).toBe("http://localhost:3000");
        expect(env.PORT).toBe(3000);
        expect(env.BILLING).toBe(false);
        expect([...env.ADMIN_EMAILS]).toEqual(["a@x.com", "b@x.com"]);
        expect(env.isLocal).toBe(true);
    });

    it("exposes a non-exiting parse for tests", () => {
        const { parseEnv } = setup({});
        const result = parseEnv({ APP_URL: "ftp://nope" });
        expect(result.success).toBe(false);
    });

    it("re-reads after reset", () => {
        const source: Record<string, string | undefined> = { APP_URL: "https://a.com" };
        const { env, resetForTests } = setup(source);
        expect(env.APP_URL).toBe("https://a.com");
        source.APP_URL = "https://b.com";
        expect(env.APP_URL).toBe("https://a.com");
        resetForTests();
        expect(env.APP_URL).toBe("https://b.com");
    });
});

describe("isConfigured", () => {
    it("rejects blanks and placeholders", () => {
        expect(isConfigured("")).toBe(false);
        expect(isConfigured("sk_replace_me")).toBe(false);
        expect(isConfigured("sk_live_1")).toBe(true);
    });
});
