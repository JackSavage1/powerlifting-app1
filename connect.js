import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);

const collections = await db.listCollections();
console.log("Connected to Astra DB!");
console.log("Collections:", collections);
