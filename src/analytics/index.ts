import type { OpenPanel } from "@openpanel/web";

export const OPENPANEL_API_URL = "https://opapi.offbeatport.com";

export type AnalyticsOptions = {
    clientId: string | undefined;
    apiUrl?: string | undefined;
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
    const clientId = options.clientId?.trim();
    if (!clientId || typeof window === "undefined") return;
    const untracked = options.untrackedPaths ?? DEFAULT_UNTRACKED_PATHS;
    client = import("@openpanel/web")
        .then(
            ({ OpenPanel }) =>
                new OpenPanel({
                    clientId,
                    apiUrl: options.apiUrl?.trim() || OPENPANEL_API_URL,
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
        .catch(() => null);
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
