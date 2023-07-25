// deno-lint-ignore no-explicit-any
export type ComponentProps<T = Record<string, any>> = T & {
  // deno-lint-ignore no-explicit-any
  children?: any | any[];
};
