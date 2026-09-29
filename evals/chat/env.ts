// Imported first by run.ts: the API client reads the key when its module loads.
import fs from "node:fs";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
