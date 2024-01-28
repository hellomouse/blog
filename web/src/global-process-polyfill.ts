if (import.meta.env.DEV) {
  // needed by @babel/types
  (globalThis as any).process = {
    env: {}
  };
}
