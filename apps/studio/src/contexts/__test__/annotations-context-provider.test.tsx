import React from "react"
import { render, act } from "@testing-library/react"
import { AnnotationsProvider } from "@/contexts/annotations-context-provider"
import { AnnotationsContext } from "@/contexts/annotations-context"
import type { Annotation, Label } from "@vailabel/core"
import type { AnnotationsContextType } from "@/contexts/annotations-context-provider"

const mockDataAccess = {
  createAnnotation: jest.fn(),
  getAnnotations: jest.fn().mockResolvedValue([]),
  updateAnnotation: jest.fn(),
  deleteAnnotation: jest.fn(),
  createLabel: jest.fn(),
  updateLabel: jest.fn(),
  deleteLabel: jest.fn(),
  getLabels: jest.fn().mockResolvedValue([]),
}

jest.mock("@/hooks/use-data-access", () => ({
  useDataAccess: () => mockDataAccess,
}))

beforeAll(() => {
  if (!global.crypto) {
    // Use type assertion to unknown, then to { crypto?: unknown }
    ;(global as unknown as { crypto?: unknown }).crypto = {}
  }
  ;(global.crypto as { randomUUID?: () => string }).randomUUID = jest.fn(
    () => "mock-uuid"
  )
})

afterEach(() => {
  jest.clearAllMocks()
})

describe("AnnotationsProvider", () => {
  it("provides default values and allows annotation creation", async () => {
    let contextValue: AnnotationsContextType | undefined
    function Consumer() {
      contextValue = React.useContext(
        AnnotationsContext
      ) as AnnotationsContextType
      return null
    }
    await act(async () => {
      render(
        <AnnotationsProvider>
          <Consumer />
        </AnnotationsProvider>
      )
    })
    expect(contextValue?.annotations).toEqual([])
    expect(typeof contextValue?.createAnnotation).toBe("function")
    await act(async () => {
      await contextValue?.createAnnotation?.({
        id: "1",
        labelId: "l1",
        color: "#fff",
        name: "label1",
      } as Annotation)
    })
    expect(mockDataAccess.createAnnotation).toHaveBeenCalled()
  })

  it("supports undo/redo", async () => {
    let contextValue: AnnotationsContextType | undefined
    mockDataAccess.getAnnotations.mockResolvedValueOnce([
      { id: "1", labelId: "l1", color: "#fff", name: "label1" },
    ])
    function Consumer() {
      contextValue = React.useContext(
        AnnotationsContext
      ) as AnnotationsContextType
      return null
    }
    await act(async () => {
      render(
        <AnnotationsProvider>
          <Consumer />
        </AnnotationsProvider>
      )
    })
    await act(async () => {
      await contextValue?.createAnnotation?.({
        id: "2",
        labelId: "l2",
        color: "#000",
        name: "label2",
      } as Annotation)
    })
    expect(contextValue?.canUndo).toBe(true)
    await act(async () => {
      contextValue?.undo?.()
    })
    expect(contextValue?.canRedo).toBe(true)
    await act(async () => {
      contextValue?.redo?.()
    })
  })

  it("getOrCreateLabel returns a label", async () => {
    let contextValue: AnnotationsContextType | undefined
    mockDataAccess.getLabels.mockResolvedValueOnce([])
    function Consumer() {
      contextValue = React.useContext(
        AnnotationsContext
      ) as AnnotationsContextType
      return null
    }
    await act(async () => {
      render(
        <AnnotationsProvider>
          <Consumer />
        </AnnotationsProvider>
      )
    })
    let label: Label | undefined
    await act(async () => {
      label = await contextValue?.getOrCreateLabel?.("test", "#fff")
    })
    expect(label?.name).toBe("test")
    expect(label?.color).toBe("#fff")
    expect(label?.id).toBe("mock-uuid")
    expect(mockDataAccess.createLabel).toHaveBeenCalled()
  })

  it("getOrCreateLabel returns existing label if found by name and color", async () => {
    let contextValue: AnnotationsContextType | undefined
    // Mock getLabels to return an existing label matching the name and color
    mockDataAccess.getLabels.mockResolvedValue([
      { id: "existing-id", name: "test", color: "#fff" },
      { id: "another-id", name: "other", color: "#fff" },
    ])
    function Consumer() {
      contextValue = React.useContext(
        AnnotationsContext
      ) as AnnotationsContextType
      return null
    }
    await act(async () => {
      render(
        <AnnotationsProvider>
          <Consumer />
        </AnnotationsProvider>
      )
    })
    let label: Label | undefined

    await act(async () => {
      label = await contextValue?.getOrCreateLabel?.("test", "#fff")
    })
    expect(label?.name).toBe("test")
    expect(label?.color).toBe("#fff")
    expect(mockDataAccess.createLabel).not.toHaveBeenCalled()

    // cleanup mock
    mockDataAccess.getLabels.mockClear()
    mockDataAccess.createLabel.mockClear()
  })
})

it("updateAnnotation updates annotation and debounces save", async () => {
  jest.useFakeTimers()
  let contextValue: AnnotationsContextType | undefined
  function Consumer() {
    contextValue = React.useContext(
      AnnotationsContext
    ) as AnnotationsContextType
    return null
  }
  await act(async () => {
    render(
      <AnnotationsProvider>
        <Consumer />
      </AnnotationsProvider>
    )
  })
  await act(async () => {
    contextValue?.setAnnotations?.([
      { id: "1", labelId: "l1", color: "#fff", name: "label1" } as Annotation,
    ])
  })
  await act(async () => {
    contextValue?.updateAnnotation?.("1", { name: "updated" })
    jest.runAllTimers()
  })
  expect(contextValue?.annotations[0].name).toBe("updated")
  expect(mockDataAccess.updateAnnotation).toHaveBeenCalledWith("1", {
    name: "updated",
  })
  jest.useRealTimers()
})

it("deleteAnnotation removes annotation and updates state/history", async () => {
  let contextValue: AnnotationsContextType | undefined
  mockDataAccess.getAnnotations.mockResolvedValueOnce([
    { id: "1", labelId: "l1", color: "#fff", name: "label1" },
  ])
  function Consumer() {
    contextValue = React.useContext(
      AnnotationsContext
    ) as AnnotationsContextType
    return null
  }
  await act(async () => {
    render(
      <AnnotationsProvider>
        <Consumer />
      </AnnotationsProvider>
    )
  })
  mockDataAccess.getAnnotations.mockResolvedValueOnce([])
  await act(async () => {
    await contextValue?.deleteAnnotation?.("1")
  })
  expect(mockDataAccess.deleteAnnotation).toHaveBeenCalledWith("1")
  expect(contextValue?.annotations).toEqual([])
})

it("createLabel, updateLabel, deleteLabel update annotations and history", async () => {
  let contextValue: AnnotationsContextType | undefined
  // Reset mock for createLabel to avoid interference from previous tests
  mockDataAccess.createLabel.mockReset()
  mockDataAccess.updateLabel.mockReset()
  mockDataAccess.deleteLabel.mockReset()
  mockDataAccess.getAnnotations.mockResolvedValue([
    { id: "1", labelId: "l1", color: "#fff", name: "label1" },
  ])
  function Consumer() {
    contextValue = React.useContext(
      AnnotationsContext
    ) as AnnotationsContextType
    return null
  }
  await act(async () => {
    render(
      <AnnotationsProvider>
        <Consumer />
      </AnnotationsProvider>
    )
  })
  await act(async () => {
    await contextValue?.createLabel?.(
      { id: "l2", name: "label2", color: "#000" } as Label,
      ["1"]
    )
    await contextValue?.updateLabel?.("l2", { name: "label2-updated" })
    await contextValue?.deleteLabel?.("l2")
  })
  expect(mockDataAccess.createLabel).toHaveBeenCalled()
  expect(mockDataAccess.updateLabel).toHaveBeenCalled()
  expect(mockDataAccess.deleteLabel).toHaveBeenCalled()
})

it("handles loading state", async () => {
  function Consumer() {
    React.useContext(AnnotationsContext) as AnnotationsContextType
    return null
  }
  mockDataAccess.getLabels.mockImplementationOnce(() => new Promise(() => {}))
  const { container } = render(
    <AnnotationsProvider>
      <Consumer />
    </AnnotationsProvider>
  )
  // Since Loading component is rendered, check for its existence
  expect(container.innerHTML).toMatch(/loading/i)
})
