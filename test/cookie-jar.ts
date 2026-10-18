export interface CookieJar {
  values: Map<string, string>;
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string): void;
  delete(name: string): void;
}

// Stands in for next/headers cookies() in route tests: one shopper's cookies, kept in a Map.
export function createCookieJar(): CookieJar {
  const values = new Map<string, string>();
  return {
    values,
    get: (name) => (values.has(name) ? { name, value: values.get(name) ?? "" } : undefined),
    set: (name, value) => {
      values.set(name, value);
    },
    delete: (name) => {
      values.delete(name);
    },
  };
}
