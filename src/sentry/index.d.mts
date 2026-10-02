export type SentrySettings = {
    dsn?: string | undefined;
    environment?: string | undefined;
    release?: string | undefined;
    tracesSampleRate?: number | undefined;
    sensitiveKeys?: readonly string[];
};

type ScrubbableEvent = {
    user?: { id?: string | number; [key: string]: unknown } | null;
    request?: { [key: string]: unknown } | null;
    extra?: Record<string, unknown>;
    contexts?: Record<string, unknown>;
    exception?: {
        values?: Array<{
            value?: string;
            stacktrace?: { frames?: Array<{ vars?: Record<string, unknown> }> };
        }>;
    };
    message?: string;
};

type ScrubbableBreadcrumb = {
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
};

export type PrivateDataCollection = {
    readonly userInfo: false;
    readonly httpBodies: never[];
    readonly cookies: false;
    readonly httpHeaders: { request: false; response: false };
    readonly urlQueryParams: false;
    readonly genAI: { inputs: false; outputs: false };
    readonly databaseQueryData: false;
    readonly stackFrameVariables: false;
};

export type SentryOptions = {
    dsn: string | undefined;
    enabled: boolean;
    environment: string;
    release: string | undefined;
    sendDefaultPii: false;
    dataCollection: PrivateDataCollection;
    tracesSampleRate: number;
    enableLogs: false;
    beforeSend: <E extends ScrubbableEvent>(event: E) => E;
    beforeBreadcrumb: <B extends ScrubbableBreadcrumb>(breadcrumb: B) => B | null;
};

export declare const SENSITIVE_KEYS: readonly string[];
export declare const PRIVATE_DATA_COLLECTION: PrivateDataCollection;
export declare function scrubString(value: string): string;
export declare function deepScrub<T>(value: T, sensitive?: RegExp, depth?: number): T;
export declare function serverOptions(settings?: SentrySettings): SentryOptions;
export declare function clientOptions(
    settings?: SentrySettings,
): SentryOptions & { integrations: never[] };
