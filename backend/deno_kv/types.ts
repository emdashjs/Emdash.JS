// deno-lint-ignore-file no-explicit-any
export type BasicKvRecord = Record<"id" | "type", string>;
export type Mutable<
  T extends Record<string | number | symbol, any>,
  E extends string | number | symbol,
> = {
  -readonly [K in keyof Omit<T, E>]: T[K];
};

type PartialByKey<T, P extends keyof T> =
  & {
    [K in keyof Omit<T, P>]: T[K];
  }
  & {
    [K in keyof Pick<T, P>]?: T[K];
  };
type OmitValue<T, V> = Pick<T, OmitKeysByValue<T, V>>;
type OmitKeysByValue<T, V> = {
  [K in keyof T]: T[K] extends V ? never : K;
}[keyof T];
type JsonType<T> = T extends Date ? Exclude<T, Date> | string
  : T extends any[] ? T
  : T extends Record<string | number | symbol, any> ? JsonLike<T>
  : T;
type AnyFunc = (...args: any[]) => any;
export type JsonLike<
  T extends Record<string | number | symbol, any>,
  E extends keyof T = never,
  P extends keyof T = never,
> = {
  -readonly [K in keyof Omit<OmitValue<PartialByKey<T, P>, AnyFunc>, E>]:
    JsonType<PartialByKey<T, P>[K]>;
};
