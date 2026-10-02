export type EnvContract = { required: string[]; optional: string[] };
export type EnvCheckResult = {
    required: string[];
    missing: string[];
    placeheld: string[];
    optionalSet: number;
};
export declare function parseContract(source: string): EnvContract;
export declare function checkEnvironment(
    contract: EnvContract,
    environment: Record<string, string | undefined>,
    extraRequired?: string[],
): EnvCheckResult;
