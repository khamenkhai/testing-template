import "dotenv/config";
import { defineConfig } from "prisma/config";

const host = process.env.DB_HOST ?? "localhost";
const port = process.env.DB_PORT ?? "5432";
const user = process.env.DB_USER ?? "postgres";
const pass = process.env.DB_PASS ?? "";
const name = process.env.DB_NAME ?? "postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `postgresql://${user}:${pass}@${host}:${port}/${name}`,
  },
});
