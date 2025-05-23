import { StateCreator } from "zustand"
import { devtools } from "zustand/middleware"

export const exceptionMiddleware = <T extends object, U = T>(
  config: StateCreator<T, [], [], U>
): StateCreator<T, [], [], U> => {
  // Return a StateCreator that always returns U
  const stateCreator: StateCreator<T, [], [], U> = (set, get, api) => {
    const safeSet = ((
      partial: T | Partial<T> | ((state: T) => T | Partial<T>),
      replace?: boolean
    ) => {
      try {
        // @ts-expect-error: Zustand set signature
        return set(partial, replace)
      } catch (err) {
        console.error("Zustand set error:", err)
      }
    }) as typeof set

    const safeGet = (() => {
      try {
        return get()
      } catch (err) {
        console.error("Zustand get error:", err)
        return {} as T
      }
    }) as typeof get

    return config(safeSet, safeGet, api)
  }
  // Correctly wrap with devtools if in development
  if (process.env.NODE_ENV === "development") {
    // @ts-expect-error Zustand devtools typing limitation
    return devtools(stateCreator, { name: "ZustandStore" })
  }
  return stateCreator
}
