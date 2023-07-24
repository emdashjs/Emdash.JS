// deno-lint-ignore-file no-explicit-any
export type BasicKvRecord = Record<"id" | "type", string>;
export type Mutable<
  T extends Record<string | number | symbol, any>,
  E extends string | number | symbol,
> = {
  -readonly [K in keyof Omit<T, E>]: T[K];
};

export type JsonLike<
  T extends Record<string | number | symbol, any>,
  E extends string | number | symbol = never,
> = {
  -readonly [K in keyof Omit<T, E>]-?: T[K] extends (...args: any[]) => any
    ? undefined
    : T[K] extends Date ? string
    : T[K] extends any[] ? T[K]
    : T[K] extends Record<string | number | symbol, any> ? JsonLike<T[K]>
    : T[K];
};
