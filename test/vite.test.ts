import { describe, expect, it, vi } from "vitest";
import { obpBuildChecks, openpanelStatus } from "../src/vite/index.mjs";

describe("openpanelStatus", () => {
    it("is on when both values are set", () => {
        expect(
            openpanelStatus({
                VITE_OPENPANEL_CLIENT_ID: "id",
                VITE_OPENPANEL_API_URL: "https://op.example",
            }),
        ).toEqual({
            level: "info",
            message: "[obp-base] OpenPanel analytics on: https://op.example",
        });
    });

    it("warns when analytics is simply not configured", () => {
        expect(openpanelStatus({}).level).toBe("warn");
    });

    it("errors when only one value is set", () => {
        const missingUrl = openpanelStatus({ VITE_OPENPANEL_CLIENT_ID: "id" });
        expect(missingUrl.level).toBe("error");
        expect(missingUrl.message).toContain("VITE_OPENPANEL_API_URL is not set");
        const missingId = openpanelStatus({ VITE_OPENPANEL_API_URL: "https://op.example" });
        expect(missingId.message).toContain("VITE_OPENPANEL_CLIENT_ID is not set");
    });
});

describe("obpBuildChecks", () => {
    it("reports once per build through Vite's logger", () => {
        const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const plugin = obpBuildChecks();
        plugin.configResolved({ env: { VITE_OPENPANEL_CLIENT_ID: "id" }, logger });
        plugin.configResolved({ env: {}, logger });
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.warn).not.toHaveBeenCalled();
    });
});
