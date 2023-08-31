// deno-lint-ignore-file ban-types
/** A collection of types that prvoide type precision to avoid collision in unions and inheritance. */
export declare namespace Precise {
  /** Any non-null, non-undefined value. */
  export type Value = {};
  /** Any number without consuming number-literal types. */
  export type Number = number & Value;
  /** Any string without consuming string-literal types. */
  export type String = string & Value;
}
