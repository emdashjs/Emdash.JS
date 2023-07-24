// deno-lint-ignore-file no-explicit-any
export type BasicKvRecord = Record<"id" | "type", string>;
export type Mutable<
  T extends Record<string | number | symbol, any>,
  E extends string | number | symbol,
> = {
  -readonly [K in keyof Omit<T, E>]: T[K];
};

type JsonType<T> = T extends (...args: any[]) => any ? undefined
  : T extends Date ? string
  : T extends any[] ? T
  : T extends Record<string | number | symbol, any> ? JsonLike<T>
  : T;
export type JsonLike<
  T extends Record<string | number | symbol, any>,
  E extends string | number | symbol = never,
> = {
  -readonly [K in keyof Omit<T, E>]-?: JsonType<T[K]>;
};
