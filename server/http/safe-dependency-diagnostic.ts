export type SafeDependencyStage =
  | 'database_query'
  | 'broker_config'
  | 'broker_fetch'
  | 'broker_http'
  | 'broker_response';

const safeStages = new Set<unknown>([
  'database_query',
  'broker_config',
  'broker_fetch',
  'broker_http',
  'broker_response',
]);

const safeSyscalls = new Set<unknown>(['getaddrinfo', 'connect', 'read', 'write']);

const errorChain = (error: unknown): Record<string, unknown>[] => {
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<object>();
  let current: unknown = error;

  // Fetch errors may wrap the useful network code several levels down. Inspect
  // only a short cause chain and copy only allowlisted fields into diagnostics.
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object' || seen.has(current as object)) break;
    const candidate = current as Record<string, unknown>;
    chain.push(candidate);
    seen.add(current as object);
    current = candidate.cause;
  }

  return chain;
};

export const safeDependencyDiagnostic = (error: unknown): Record<string, string | number> => {
  const chain = errorChain(error);
  const root = chain[0] ?? {};
  const diagnostic: Record<string, string | number> = {
    name: typeof root.name === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(root.name)
      ? root.name
      : 'unknown',
  };

  const code = chain.map((candidate) => candidate.code)
    .find((value) => typeof value === 'string' && /^[A-Z0-9_]{1,40}$/.test(value));
  if (typeof code === 'string') diagnostic.code = code;

  const syscall = chain.map((candidate) => candidate.syscall)
    .find((value) => safeSyscalls.has(value));
  if (typeof syscall === 'string') diagnostic.syscall = syscall;

  const port = chain.map((candidate) => candidate.port)
    .find((value) => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 65535);
  if (typeof port === 'number') diagnostic.port = port;

  const stage = chain.map((candidate) => candidate.stage).find((value) => safeStages.has(value));
  if (typeof stage === 'string') diagnostic.stage = stage;

  const brokerStatus = chain.map((candidate) => candidate.brokerStatus)
    .find((value) => typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599);
  if (typeof brokerStatus === 'number') diagnostic.brokerStatus = brokerStatus;

  return diagnostic;
};
