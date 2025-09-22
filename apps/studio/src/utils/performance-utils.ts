import { clearBoundingBoxCache } from "@/tools/canvas-utils"

// Performance optimization utilities for canvas rendering

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function to limit function calls to a maximum frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * RequestAnimationFrame-based throttling for smooth animations
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null
  
  return (...args: Parameters<T>) => {
    if (rafId !== null) return
    
    rafId = requestAnimationFrame(() => {
      func(...args)
      rafId = null
    })
  }
}

/**
 * Batch DOM updates to prevent layout thrashing
 */
export class BatchUpdater {
  private updates: (() => void)[] = []
  private rafId: number | null = null

  add(update: () => void) {
    this.updates.push(update)
    this.schedule()
  }

  private schedule() {
    if (this.rafId !== null) return
    
    this.rafId = requestAnimationFrame(() => {
      this.flush()
    })
  }

  private flush() {
    const updates = this.updates.splice(0)
    updates.forEach(update => update())
    this.rafId = null
  }
}

/**
 * Clear performance caches when annotations change
 */
export function clearAnnotationCaches(annotationId?: string) {
  clearBoundingBoxCache(annotationId)
}

/**
 * Check if two objects are shallow equal
 */
export function shallowEqual<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T
): boolean {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false
  }
  
  return true
}

/**
 * Memoize expensive calculations with cache invalidation
 */
export function createMemoizedFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args) as ReturnType<T>
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private marks: Map<string, number> = new Map()
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  
  mark(name: string) {
    this.marks.set(name, performance.now())
  }
  
  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`Start mark "${startMark}" not found`)
      return 0
    }
    
    const duration = performance.now() - start
    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
    return duration
  }
  
  clear() {
    this.marks.clear()
  }
}
