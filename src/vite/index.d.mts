export type BuildCheckStatus = { level: "info" | "warn" | "error"; message: string };

export declare function openpanelStatus(env: Record<string, string | undefined>): BuildCheckStatus;

export declare function obpBuildChecks(): {
    name: string;
    apply: "build";
    configResolved: (config: {
        env: Record<string, string | undefined>;
        logger: Record<BuildCheckStatus["level"], (message: string, options?: object) => void>;
    }) => void;
};
