// Mocks a minimal IDataAccess for testing annotation components without IndexedDB or API
import type { IDataAccess } from "@vailabel/core/src/data/interface/IDataAccess"
import type { Annotation, Label } from "@vailabel/core"

export function createMockDataAccess({
  annotations = [],
  labels = [],
}: {
  annotations?: Annotation[]
  labels?: Label[]
} = {}): IDataAccess {
  return {
    // Project
    getProjects: jest.fn().mockResolvedValue([]),
    getProjectById: jest.fn().mockResolvedValue(undefined),
    getProjectWithImages: jest.fn().mockResolvedValue(undefined),
    createProject: jest.fn().mockResolvedValue(undefined),
    updateProject: jest.fn().mockResolvedValue(undefined),
    deleteProject: jest.fn().mockResolvedValue(undefined),
    // Image
    getImages: jest.fn().mockResolvedValue([]),
    getImagesWithPagination: jest.fn().mockResolvedValue([]),
    getNextImageId: jest.fn().mockResolvedValue(null),
    getPreviousImageId: jest.fn().mockResolvedValue(null),
    createImage: jest.fn().mockResolvedValue(undefined),
    updateImage: jest.fn().mockResolvedValue(undefined),
    deleteImage: jest.fn().mockResolvedValue(undefined),
    // Annotation
    getAnnotations: jest.fn().mockResolvedValue(annotations),
    getAnnotationsWithFilter: jest.fn().mockResolvedValue(annotations),
    createAnnotation: jest.fn().mockResolvedValue(undefined),
    updateAnnotation: jest.fn().mockResolvedValue(undefined),
    deleteAnnotation: jest.fn().mockResolvedValue(undefined),
    // Label
    createLabel: jest.fn().mockResolvedValue(undefined),
    getLabels: jest.fn().mockResolvedValue(labels),
    getLabelById: jest
      .fn()
      .mockImplementation((id) =>
        Promise.resolve(labels.find((l) => l.id === id))
      ),
    updateLabel: jest.fn().mockResolvedValue(undefined),
    deleteLabel: jest.fn().mockResolvedValue(undefined),
    // Settings
    getSettings: jest.fn().mockResolvedValue([]),
    updateSetting: jest.fn().mockResolvedValue(undefined),
    // History
    getHistory: jest.fn().mockResolvedValue([]),
    updateHistory: jest.fn().mockResolvedValue(undefined),
  }
}
