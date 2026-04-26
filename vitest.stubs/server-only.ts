// Vitest stub for `server-only`. The real module throws when imported
// outside Next's bundler context. Tests run under Vitest in Node, where
// the guard is unnecessary — this empty module short-circuits the import.
export {};
