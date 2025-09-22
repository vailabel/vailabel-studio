import { useCallback, useMemo, useRef } from "react"

/**
 * Hook for creating a debounced function
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => func(...args), wait)
    },
    [func, wait]
  )
}

/**
 * Hook for creating a throttled function
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false)

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        func(...args)
        inThrottle.current = true
        setTimeout(() => {
          inThrottle.current = false
        }, limit)
      }
    },
    [func, limit]
  )
}

/**
 * Hook for optimizing re-renders by memoizing callback functions
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps)
}

/**
 * Hook for creating a stable reference to a value that doesn't change often
 */
export function useStableValue<T>(
  value: T,
  compareFunction?: (prev: T, next: T) => boolean
): T {
  const ref = useRef<T>(value)

  const shouldUpdate = compareFunction
    ? !compareFunction(ref.current, value)
    : ref.current !== value

  if (shouldUpdate) {
    ref.current = value
  }

  return ref.current
}

/**
 * Hook for lazy initialization of expensive computations
 */
export function useLazyMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const memoizedValue = useMemo(() => {
    return factory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return memoizedValue
}

/**
 * Hook for creating a stable object reference
 */
export function useStableObject<T extends Record<string, unknown>>(obj: T): T {
  const serialized = useMemo(() => JSON.stringify(obj), [obj])
  return useMemo(() => obj, [serialized])
}

/**
 * Hook for creating a stable array reference
 */
export function useStableArray<T>(arr: T[]): T[] {
  const serialized = useMemo(() => JSON.stringify(arr), [arr])
  return useMemo(() => arr, [serialized])
}

/**
 * Deep comparison utility function
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>)
    const keysB = Object.keys(b as Record<string, unknown>)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (
        !isDeepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      )
        return false
    }

    return true
  }

  return false
}
