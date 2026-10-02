const PLACEHOLDERS = [/replace[-_]?me/i, /^0{8}-0{4}-0{4}-0{4}-0{12}$/];

export function parseContract(source) {
    const required = [];
    const optional = [];
    let pendingRequired = false;
    for (const rawLine of source.split("\n")) {
        const line = rawLine.trim();
        if (line.startsWith("#")) {
            if (/\bREQUIRED\b/.test(line)) pendingRequired = true;
            continue;
        }
        if (line === "") {
            pendingRequired = false;
            continue;
        }
        const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
        if (!match) continue;
        (pendingRequired ? required : optional).push(match[1]);
        pendingRequired = false;
    }
    return { required, optional };
}

export function checkEnvironment(contract, environment, extraRequired = []) {
    const required = [...new Set([...contract.required, ...extraRequired])];
    const isBlank = (name) => {
        const value = environment[name];
        return value === undefined || value.trim() === "";
    };
    const missing = required.filter(isBlank);
    const placeheld = required
        .filter((name) => !isBlank(name))
        .filter((name) => PLACEHOLDERS.some((pattern) => pattern.test(String(environment[name]))));
    const optionalSet = contract.optional.filter((name) => !isBlank(name)).length;
    return { required, missing, placeheld, optionalSet };
}
