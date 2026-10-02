import { describe, expect, it } from "vitest";
import { clientOptions, deepScrub, scrubString, serverOptions } from "../src/sentry/index.mjs";

describe("scrubString", () => {
    it("redacts emails, image data and long base64", () => {
        const image = `data:image/png;base64,${"A".repeat(40)}`;
        const blob = "B".repeat(200);
        expect(scrubString(`mail ana@example.com ${image} ${blob}`)).toBe(
            "mail [email-redacted] [image-data-redacted] [binary-redacted]",
        );
    });

    it("truncates very long strings", () => {
        const scrubbed = scrubString("word ".repeat(1000));
        expect(scrubbed.endsWith("…[truncated]")).toBe(true);
        expect(scrubbed.length).toBeLessThan(250);
    });
});

describe("deepScrub", () => {
    it("redacts sensitive keys at any depth", () => {
        expect(deepScrub({ a: { password: "x", ok: "fine" }, list: [{ token: "t" }] })).toEqual({
            a: { password: "[redacted]", ok: "fine" },
            list: [{ token: "[redacted]" }],
        });
    });
});

describe("serverOptions", () => {
    it("is disabled without a DSN", () => {
        const options = serverOptions({});
        expect(options.enabled).toBe(false);
        expect(options.environment).toBe("development");
    });

    it("reduces the user to an id and strips request data", () => {
        const options = serverOptions({ dsn: "https://key@o1.ingest.sentry.io/1" });
        const event = options.beforeSend({
            user: { id: "u1", email: "ana@example.com" },
            request: { data: "body", cookies: "c", headers: { cookie: "c", accept: "*/*" } },
            extra: { photo: "bytes", note: "ana@example.com" },
        });
        expect(event.user).toEqual({ id: "u1" });
        expect(event.request).toEqual({ headers: { accept: "*/*" } });
        expect(event.extra).toEqual({ photo: "[redacted]", note: "[email-redacted]" });
    });

    it("honours extra sensitive keys", () => {
        const options = serverOptions({ sensitiveKeys: ["prompt"] });
        expect(options.beforeSend({ extra: { prompt: "secret plan" } }).extra).toEqual({
            prompt: "[redacted]",
        });
    });
});

describe("clientOptions", () => {
    it("drops console and input breadcrumbs", () => {
        const options = clientOptions({ dsn: "https://key@o1.ingest.sentry.io/1" });
        expect(options.beforeBreadcrumb({ category: "console" })).toBeNull();
        expect(options.beforeBreadcrumb({ category: "ui.input" })).toBeNull();
        expect(options.beforeBreadcrumb({ category: "navigation", message: "/a" })).toEqual({
            category: "navigation",
            message: "/a",
        });
        expect(options.environment).toBe("production");
        expect(options.integrations).toEqual([]);
    });
});
