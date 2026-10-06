import { createProductionApp } from '../server/entrypoint';

const { app } = createProductionApp();

export default app;