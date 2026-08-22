// Loads .env into process.env for the integration suite, the same file
// `next dev`/`next build` already read from — so `npm run test:integration`
// uses the same Supabase project the app is already pointed at locally,
// with no separate test-env setup. Silently a no-op if there's no .env or
// the values already came from the shell (CI, for example).
try {
  process.loadEnvFile?.(".env");
} catch {
  // No .env file — fine, integration tests just skip themselves below.
}
