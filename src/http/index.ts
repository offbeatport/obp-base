export type SecurityHeaderOptions = {
    hsts?: boolean;
    payment?: boolean;
};

const HSTS = "max-age=31536000; includeSubDomains";

export function securityHeaders(options: SecurityHeaderOptions = {}): Record<string, string> {
    const permissions = ["camera=()", "microphone=()", "geolocation=()"];
    if (options.payment) permissions.push("payment=(self)");
    return {
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-frame-options": "DENY",
        "permissions-policy": permissions.join(", "),
        "cross-origin-opener-policy": "same-origin",
        ...(options.hsts ? { "strict-transport-security": HSTS } : {}),
    };
}

export function withSecurityHeaders(
    response: Response,
    options: SecurityHeaderOptions = {},
): Response {
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(securityHeaders(options))) {
        if (!headers.has(name)) headers.set(name, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export type HealthDetails = Record<string, unknown> & { healthy?: boolean };

const NO_STORE = { "cache-control": "no-store" };

export function healthResponse(probe: () => HealthDetails | undefined = () => undefined): Response {
    let details: HealthDetails | undefined;
    try {
        details = probe();
    } catch {
        return Response.json({ status: "error" }, { status: 503, headers: NO_STORE });
    }
    const { healthy = true, ...rest } = details ?? {};
    return Response.json(
        {
            status: healthy ? "ok" : "degraded",
            uptimeSeconds: Math.round(process.uptime()),
            ...rest,
        },
        { status: healthy ? 200 : 503, headers: NO_STORE },
    );
}
