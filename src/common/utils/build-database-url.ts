export function buildDatabaseUrl(): string {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'postgres';
  const pass = process.env.DB_PASS ?? '';
  const name = process.env.DB_NAME ?? 'postgres';

  return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}
