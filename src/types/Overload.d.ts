import type WebSocket from 'ws'

// credits goes to https://stackoverflow.com/a/50375286
// function intersection producec - function overloads
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
type IsNever<T> = [T] extends [UnionToIntersection<T>] ? true : false

type Values<T> = T[keyof T]

/**
 * Generate all possible combinations of allowed arguments
 */
type AllOverloads<Mappings, Keys extends string> = {
  [Prop in Keys]: Prop extends keyof Mappings
    ? (type: Prop, event: Mappings[Prop]) => any
    : (type: Prop) => any
}

/**
 * Convert all allowed combinations to function overload
 */
export type Overloading<
  Mappings,
  Keys extends string
> = keyof Mappings extends Keys
  ? UnionToIntersection<Values<AllOverloads<Mappings, Keys>>>
  : never

/**
 * Take Overloading<ClientListenerTypes, ClientListenerKeys> and
 * add another parameter into all possible combinations
 * called listener which is a function with two parameters
 * (ws: WebSocket, data: any) => void
 *
 * This is the same as OverloadingWithFunction<ClientListenerTypes, ClientListenerKeys, (ws: WebSocket, data: any) => void>
 */

type OverloadingWithFunction<
  Mappings,
  Keys extends string,
  F
> = keyof Mappings extends Keys
  ? UnionToIntersection<
      Values<{
        [Prop in Keys]: Prop extends keyof Mappings
          ? (type: Prop, event: Mappings[Prop], listener: F) => any
          : (type: Prop) => any
      }>
    >
  : never

/**
 * Now make it with (ws: WebSocket, type: string, event: string, data: any) => void
 * and we have all possible combinations of arguments
 * for registerServerListener and registerClientListener
 * with all possible combinations of events
 * and all possible combinations of types
 */
export type OverloadingSendMessage<
  Mappings,
  Keys extends string
> = keyof Mappings extends Keys
  ? UnionToIntersection<
      Values<{
        [Prop in Keys]: Prop extends keyof Mappings
          ? (
              ws: WebSocket,
              type: Prop,
              event: Mappings[Prop],
              message: any
            ) => any
          : (ws: WebSocket, type: Prop) => any
      }>
    >
  : never

export type OverloadingSendMessageAll<
  Mappings,
  Keys extends string
> = keyof Mappings extends Keys
  ? UnionToIntersection<
      Values<{
        [Prop in Keys]: Prop extends keyof Mappings
          ? (type: Prop, event: Mappings[Prop], message: any) => any
          : (ws: WebSocket, type: Prop) => any
      }>
    >
  : never

export type OverloadingInvokeListener<
  Mappings,
  Keys extends string
> = keyof Mappings extends Keys
  ? UnionToIntersection<
      Values<{
        [Prop in Keys]: Prop extends keyof Mappings
          ? (type: Prop, event: Mappings[Prop], ws: WebSocket, data: any) => any
          : (ws: WebSocket, type: Prop) => any
      }>
    >
  : never
