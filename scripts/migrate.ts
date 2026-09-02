import { getClient } from "../lib/db";

await getClient();
console.log("Vaultify database is ready.");
