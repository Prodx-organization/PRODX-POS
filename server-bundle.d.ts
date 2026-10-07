export declare const createProductionApp: () => Promise<{
  app: import('express').Express;
  pool: import('pg').Pool;
}>;
