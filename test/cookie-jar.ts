// Stands in for next/headers cookies() in route tests: one shopper's cookies, kept in a Map.
export function createCookieJar() {
  const values = new Map<string, string>();
  return {
    values,
    get: (name: string) => (values.has(name) ? { name, value: values.get(name) ?? "" } : undefined),
    set: (name: string, value: string) => {
      values.set(name, value);
    },
  };
}
