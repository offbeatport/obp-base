const IMAGE_DATA_URI = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
const LONG_BASE64 = /[A-Za-z0-9+/]{180,}={0,2}/g;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAX_STRING = 2000;
const MAX_DEPTH = 8;

export const SENSITIVE_KEYS = [
    "input",
    "text",
    "markdown",
    "content",
    "body",
    "html",
    "source",
    "draft",
    "article",
    "file",
    "files",
    "image",
    "images",
    "photo",
    "photos",
    "upload",
    "uploads",
    "dataurl",
    "data_url",
    "base64",
    "buffer",
    "blob",
    "bytes",
    "password",
    "token",
    "secret",
    "apikey",
    "api_key",
    "authorization",
    "cookie",
    "email",
    "customer_email",
];

const SENSITIVE_HEADERS = ["authorization", "cookie", "set-cookie", "x-api-key"];

export const PRIVATE_DATA_COLLECTION = Object.freeze({
    userInfo: false,
    httpBodies: [],
    cookies: false,
    httpHeaders: { request: false, response: false },
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    stackFrameVariables: false,
});

export function scrubString(value) {
    const bounded = value.length > MAX_STRING ? `${value.slice(0, 200)}…[truncated]` : value;
    return bounded
        .replace(IMAGE_DATA_URI, "[image-data-redacted]")
        .replace(LONG_BASE64, "[binary-redacted]")
        .replace(EMAIL, "[email-redacted]");
}

function keyMatcher(keys) {
    const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`^(${escaped.join("|")})$`, "i");
}

const DEFAULT_MATCHER = keyMatcher(SENSITIVE_KEYS);

export function deepScrub(value, sensitive = DEFAULT_MATCHER, depth = 0) {
    if (depth > MAX_DEPTH) return "[max-depth]";
    if (typeof value === "string") return scrubString(value);
    if (Array.isArray(value)) return value.map((item) => deepScrub(item, sensitive, depth + 1));
    if (value && typeof value === "object") {
        const out = {};
        for (const [key, entry] of Object.entries(value)) {
            out[key] = sensitive.test(key) ? "[redacted]" : deepScrub(entry, sensitive, depth + 1);
        }
        return out;
    }
    return value;
}

function stripRequest(request) {
    if (!request) return;
    request.data = undefined;
    request.cookies = undefined;
    request.query_string = undefined;
    if (request.headers) {
        for (const header of SENSITIVE_HEADERS) request.headers[header] = undefined;
    }
}

function scrubEvent(event, sensitive) {
    if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id };
    stripRequest(event.request);
    if (event.extra) event.extra = deepScrub(event.extra, sensitive);
    if (event.contexts) event.contexts = deepScrub(event.contexts, sensitive);
    for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = scrubString(exception.value);
        for (const frame of exception.stacktrace?.frames ?? []) {
            if (frame.vars) frame.vars = deepScrub(frame.vars, sensitive);
        }
    }
    if (event.message) event.message = scrubString(event.message);
    return event;
}

const DROPPED_BREADCRUMBS = new Set(["console", "ui.input"]);

function scrubBreadcrumb(breadcrumb, sensitive) {
    if (DROPPED_BREADCRUMBS.has(breadcrumb.category)) return null;
    if (breadcrumb.message) breadcrumb.message = scrubString(breadcrumb.message);
    if (breadcrumb.data) breadcrumb.data = deepScrub(breadcrumb.data, sensitive);
    return breadcrumb;
}

function baseOptions(settings, fallbackEnvironment) {
    const dsn = settings.dsn?.trim() || undefined;
    const sensitive = keyMatcher([...SENSITIVE_KEYS, ...(settings.sensitiveKeys ?? [])]);
    return {
        dsn,
        enabled: Boolean(dsn),
        environment: settings.environment?.trim() || fallbackEnvironment,
        release: settings.release?.trim() || undefined,
        sendDefaultPii: false,
        dataCollection: PRIVATE_DATA_COLLECTION,
        tracesSampleRate: settings.tracesSampleRate ?? 0,
        enableLogs: false,
        beforeSend: (event) => scrubEvent(event, sensitive),
        beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb, sensitive),
    };
}

export function serverOptions(settings = {}) {
    return baseOptions(settings, "development");
}

export function clientOptions(settings = {}) {
    return { ...baseOptions(settings, "production"), integrations: [] };
}
