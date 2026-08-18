/**
 * A `try/catch` only ever catches a promise that *rejects*. If a request
 * just hangs — a cold Supabase project, a dropped connection with no
 * server-side timeout — the promise never settles at all, so a plain
 * try/catch does nothing and a "Creating account…" button spins forever.
 *
 * This races the real request against a timer, so the UI is guaranteed to
 * hear back one way or the other within `ms`.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 15_000): Promise<T> {
  // Supabase's query/RPC builders are thenables, not real Promises (no
  // .catch/.finally) — Promise.resolve() normalizes either into one before
  // racing it against the timer.
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("That's taking too long. Check your connection and try again.")),
        ms
      )
    ),
  ]);
}
