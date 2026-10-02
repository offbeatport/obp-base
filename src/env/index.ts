import { z } from "zod/v4";

export const nonEmpty = (label: string) => z.string().trim().min(1, `${label} must not be empty`);

export const url = (label: string) =>
    nonEmpty(label)
        .refine(
            (value) => /^https?:\/\//.test(value),
            `${label} must start with http:// or https://`,
        )
        .transform((value) => value.replace(/\/+$/, ""));

export const intIn = (label: string, min: number, max: number) =>
    z.coerce
        .number()
        .int(`${label} must be a whole number`)
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} must be at most ${max}`);

export const flag = (fallback: "true" | "false") =>
    z
        .enum(["true", "false"])
        .default(fallback)
        .transform((value) => value === "true");

export const emailList = () =>
    z
        .string()
        .default("")
        .transform(
            (value) =>
                new Set(
                    value
                        .split(",")
                        .map((email) => email.trim().toLowerCase())
                        .filter(Boolean),
                ) as ReadonlySet<string>,
        );

export const isPlaceholder = (value: string) => /replace[-_]?me/i.test(value);

export const isConfigured = (value: string) => value.trim() !== "" && !isPlaceholder(value);

type Source = Record<string, string | undefined>;

export type EnvDefinition<Schema extends z.ZodType<object>, Config extends object> = {
    app: string;
    schema: Schema;
    derive: (parsed: z.output<Schema>) => Config;
    source?: () => Source;
};

export type DefinedEnv<Schema extends z.ZodType<object>, Config extends object> = {
    env: Config;
    loadEnv: () => Config;
    assertEnv: () => void;
    parseEnv: (source?: Source) => z.ZodSafeParseResult<z.output<Schema>>;
    resetForTests: () => void;
};

export function formatEnvReport(
    app: string,
    issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
    source: Source,
): string {
    const lines = ["", `  ${app} cannot start: the environment is not configured.`, ""];
    for (const issue of issues) {
        const key = issue.path.map(String).join(".") || "(root)";
        const value = source[key];
        const missing = value === undefined || value.trim() === "";
        lines.push(`    ${key.padEnd(34)} ${missing ? "is not set" : issue.message}`);
    }
    lines.push("", "  Copy .env.example to .env and fill in the values above.", "");
    return lines.join("\n");
}

export function defineEnv<Schema extends z.ZodType<object>, Config extends object>(
    definition: EnvDefinition<Schema, Config>,
): DefinedEnv<Schema, Config> {
    const readSource = definition.source ?? (() => process.env);
    let cached: Config | null = null;

    const parseEnv = (source: Source = readSource()) => definition.schema.safeParse(source);

    const loadEnv = (): Config => {
        if (cached) return cached;
        const source = readSource();
        const result = parseEnv(source);
        if (result.success) {
            cached = definition.derive(result.data);
            return cached;
        }
        console.error(formatEnvReport(definition.app, result.error.issues, source));
        process.exit(1);
    };

    const env = new Proxy({} as Config, {
        get: (_target, property) => loadEnv()[property as keyof Config],
        has: (_target, property) => property in loadEnv(),
        ownKeys: () => Reflect.ownKeys(loadEnv()),
        getOwnPropertyDescriptor: (_target, property) =>
            Reflect.getOwnPropertyDescriptor(loadEnv(), property),
    });

    return {
        env,
        loadEnv,
        assertEnv: () => {
            loadEnv();
        },
        parseEnv,
        resetForTests: () => {
            cached = null;
        },
    };
}
