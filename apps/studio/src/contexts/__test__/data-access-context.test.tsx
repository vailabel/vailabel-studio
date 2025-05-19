import { render } from "@testing-library/react"
import {
  DataAccessProvider,
  DataAccessContext,
  dataAccessStrategies,
  getDefaultType,
} from "@/contexts/data-access-context"

// Mock dependencies
jest.mock("@vailabel/core/src/data", () => ({
  ApiDataAccess: jest.fn(() => ({ type: "api" })),
  DexieDataAccess: jest.fn(() => ({ type: "dexie" })),
  SQLiteDataAccess: jest.fn(() => ({ type: "sqlite" })),
}))
jest.mock("@/lib/constants", () => ({
  isElectron: jest.fn(),
}))

describe("getDefaultType", () => {
  let originalWindow: Window | undefined

  beforeAll(() => {
    originalWindow = global.window
  })

  afterAll(() => {
    if (typeof originalWindow !== "undefined") {
      global.window = originalWindow as typeof global.window
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns 'api' when window is undefined", () => {
    // Remove window
    // Save and delete global.window
    const prevWindow: typeof global.window | undefined =
      typeof global.window !== "undefined" ? global.window : undefined
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(false)
    // Actually remove window for SSR/Node simulation
    // Use type assertion to unknown, then to { window?: unknown }
    delete (global as unknown as { window?: unknown }).window
    expect(getDefaultType()).toBe("api")
    // Restore window for other tests
    if (typeof prevWindow !== "undefined") {
      global.window = prevWindow as typeof global.window
    }
  })

  it("returns 'sqlite' when isElectron is true", () => {
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(true)
    if (typeof global.window === "undefined") {
      global.window = {} as Window & typeof globalThis
    }
    expect(getDefaultType()).toBe("sqlite")
  })

  it("returns 'dexie' in browser when isElectron is false", () => {
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(false)
    if (typeof global.window === "undefined") {
      global.window = {} as Window & typeof globalThis
    }
    expect(getDefaultType()).toBe("dexie")
  })
})

describe("dataAccessStrategies", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns ApiDataAccess for 'api'", () => {
    const api = dataAccessStrategies.api()
    expect(typeof api).toBe("object")
  })
  it("returns DexieDataAccess for 'dexie'", () => {
    const dexie = dataAccessStrategies.dexie()
    expect(typeof dexie).toBe("object")
  })
  it("returns SQLiteDataAccess for 'sqlite' when isElectron is true", () => {
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(true)
    const sqlite = dataAccessStrategies.sqlite()
    expect(typeof sqlite).toBe("object")
  })
  it("throws for 'sqlite' when isElectron is false", () => {
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(false)
    expect(() => dataAccessStrategies.sqlite()).toThrow(
      "SQLite is only supported in Electron environment"
    )
  })
})

describe("DataAccessProvider", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("provides api data access when type is 'api'", () => {
    let contextValue: unknown
    render(
      <DataAccessProvider type="api">
        <DataAccessContext.Consumer>
          {(value) => {
            contextValue = value
            return null
          }}
        </DataAccessContext.Consumer>
      </DataAccessProvider>
    )
    expect(
      contextValue &&
        typeof (contextValue as { dataAccess: unknown }).dataAccess
    ).toBe("object")
  })

  it("provides dexie data access when type is 'dexie'", () => {
    let contextValue: unknown
    render(
      <DataAccessProvider type="dexie">
        <DataAccessContext.Consumer>
          {(value) => {
            contextValue = value
            return null
          }}
        </DataAccessContext.Consumer>
      </DataAccessProvider>
    )
    expect(
      contextValue &&
        typeof (contextValue as { dataAccess: unknown }).dataAccess
    ).toBe("object")
  })

  it("provides sqlite data access when isElectron is true", () => {
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(true)
    let contextValue: unknown
    render(
      <DataAccessProvider>
        <DataAccessContext.Consumer>
          {(value) => {
            contextValue = value
            return null
          }}
        </DataAccessContext.Consumer>
      </DataAccessProvider>
    )
    expect(
      contextValue &&
        typeof (contextValue as { dataAccess: unknown }).dataAccess
    ).toBe("object")
  })

  it("throws error for unknown type", () => {
    // Reset isElectron to false to avoid sqlite override
    ;(
      jest.requireMock("@/lib/constants").isElectron as jest.Mock
    ).mockReturnValue(false)
    // Use a type assertion to never to bypass type check for test
    expect(() => {
      render(
        <DataAccessProvider type={"unknown" as never}>
          <div />
        </DataAccessProvider>
      )
    }).toThrow("Unknown data access type: unknown")
  })
})
