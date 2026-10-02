import { describe, expect, it } from "vitest";
import { healthResponse, securityHeaders, withSecurityHeaders } from "../src/http/index";

describe("securityHeaders", () => {
    it("adds HSTS and payment only when asked", () => {
        expect(securityHeaders()["strict-transport-security"]).toBeUndefined();
        expect(securityHeaders({ hsts: true })["strict-transport-security"]).toContain("max-age");
        expect(securityHeaders({ payment: true })["permissions-policy"]).toContain(
            "payment=(self)",
        );
    });

    it("never overrides a header the route set", () => {
        const response = withSecurityHeaders(
            new Response("x", { headers: { "x-frame-options": "SAMEORIGIN" } }),
        );
        expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    });
});

describe("healthResponse", () => {
    it("is 200 with details when the probe passes", async () => {
        const response = healthResponse(() => ({ queue: 2 }));
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toMatchObject({ status: "ok", queue: 2 });
    });

    it("is 503 when the probe throws or reports unhealthy", async () => {
        expect(
            healthResponse(() => {
                throw new Error("db");
            }).status,
        ).toBe(503);
        const degraded = healthResponse(() => ({ healthy: false, pendingMigrations: true }));
        expect(degraded.status).toBe(503);
        expect(await degraded.json()).toMatchObject({
            status: "degraded",
            pendingMigrations: true,
        });
    });
});
