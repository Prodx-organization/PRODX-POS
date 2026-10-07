export declare const createProductionApp: (options?: {
  vercelOidcToken?: string;
}) => Promise<{
  app: import('express').Express;
  pool: import('pg').Pool;
}>;
