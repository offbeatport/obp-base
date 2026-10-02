const CLIENT_ID = "VITE_OPENPANEL_CLIENT_ID";
const API_URL = "VITE_OPENPANEL_API_URL";

export function openpanelStatus(env) {
    const clientId = env[CLIENT_ID]?.trim() ?? "";
    const apiUrl = env[API_URL]?.trim() ?? "";
    if (clientId && apiUrl) {
        return { level: "info", message: `[obp-base] OpenPanel analytics on: ${apiUrl}` };
    }
    if (!clientId && !apiUrl) {
        return {
            level: "warn",
            message: `[obp-base] OpenPanel analytics off: ${CLIENT_ID} and ${API_URL} are not set for this build.`,
        };
    }
    const missing = clientId ? API_URL : CLIENT_ID;
    const present = clientId ? CLIENT_ID : API_URL;
    return {
        level: "error",
        message: `[obp-base] OpenPanel analytics off: ${missing} is not set for this build, but ${present} is. Set it as a build variable and redeploy.`,
    };
}

let reported = false;

export function obpBuildChecks() {
    return {
        name: "obp-base:build-checks",
        apply: "build",
        configResolved(config) {
            if (reported) return;
            reported = true;
            const status = openpanelStatus(config.env);
            config.logger[status.level](status.message, { timestamp: true });
        },
    };
}
