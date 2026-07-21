const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error('TEST_DATABASE_URL is required for real PostgreSQL tests. Refusing to use DATABASE_URL.');
const url = new URL(value);
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!localHosts.has(url.hostname) || /neon|supabase|amazonaws|render|railway/i.test(url.hostname)) {
  throw new Error('TEST_DATABASE_URL must target a dedicated local PostgreSQL database; Neon and remote hosts are forbidden.');
}
if (!/^morocco_medication(?:_api)?_test(?:_[a-z0-9_]+)?$/i.test(url.pathname.slice(1))) {
  throw new Error('TEST_DATABASE_URL must use a dedicated local database named morocco_medication_test (or a suffixed variant).');
}
console.log(`Using isolated PostgreSQL database ${url.hostname}/${url.pathname.slice(1)}`);
