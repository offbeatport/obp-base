import type { OpenPanel } from "@openpanel/web";

export type AnalyticsOptions = {
    clientId: string | undefined;
    apiUrl: string | undefined;
    untrackedPaths?: RegExp;
    trackOutgoingLinks?: boolean;
    trackAttributes?: boolean;
};

export type AnalyticsProperties = Record<string, unknown>;

export type AnalyticsUser = {
    email?: string | null;
    name?: string | null;
};

const DEFAULT_UNTRACKED_PATHS = /^\/admin(\/|$)/;

let client: Promise<OpenPanel | null> = Promise.resolve(null);

function pathOf(href: unknown): string | null {
    if (typeof href !== "string") return null;
    try {
        return new URL(href).pathname;
    } catch {
        return null;
    }
}

export function startAnalytics(options: AnalyticsOptions): void {
    if (typeof window === "undefined") return;
    const clientId = options.clientId?.trim();
    const apiUrl = options.apiUrl?.trim();
    if (!clientId && !apiUrl) return;
    if (!clientId || !apiUrl) {
        const missing = clientId ? "VITE_OPENPANEL_API_URL" : "VITE_OPENPANEL_CLIENT_ID";
        console.error(`[analytics] OpenPanel is off: ${missing} was not set at build time.`);
        return;
    }
    const untracked = options.untrackedPaths ?? DEFAULT_UNTRACKED_PATHS;
    client = import("@openpanel/web")
        .then(
            ({ OpenPanel }) =>
                new OpenPanel({
                    clientId,
                    apiUrl,
                    trackScreenViews: true,
                    trackOutgoingLinks: options.trackOutgoingLinks ?? false,
                    trackAttributes: options.trackAttributes ?? false,
                    filter: (event) => {
                        if (event.type !== "track") return true;
                        const path = pathOf(event.payload.properties?.__path);
                        return path === null || !untracked.test(path);
                    },
                }),
        )
        .catch((error: unknown) => {
            console.error("[analytics] OpenPanel failed to load:", error);
            return null;
        });
}

function withClient(use: (openpanel: OpenPanel) => unknown): void {
    void client.then((openpanel) => openpanel && use(openpanel)).catch(() => {});
}

export function track(name: string, properties?: AnalyticsProperties): void {
    withClient((openpanel) => openpanel.track(name, properties));
}

export function identify(profileId: string, user: AnalyticsUser = {}): void {
    withClient((openpanel) =>
        openpanel.identify({
            profileId,
            email: user.email ?? undefined,
            firstName: user.name ?? undefined,
        }),
    );
}

export function resetIdentity(): void {
    withClient((openpanel) => openpanel.clear());
}
