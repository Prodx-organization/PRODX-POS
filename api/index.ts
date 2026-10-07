import { createProductionApp } from '../server-bundle.js';

const { app } = await createProductionApp();

export default app;
