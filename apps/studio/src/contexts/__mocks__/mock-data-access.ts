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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAnnotations: jest
      .fn()
      .mockImplementation((_imageId: string) => Promise.resolve(annotations)),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAnnotationsWithFilter: jest
      .fn()
      .mockImplementation((_imageId: string, _filter: Partial<Annotation>) =>
        Promise.resolve(annotations)
      ),
    createAnnotation: jest.fn().mockResolvedValue(undefined),
    updateAnnotation: jest.fn().mockResolvedValue(undefined),
    deleteAnnotation: jest.fn().mockResolvedValue(undefined),
    // Label
    createLabel: jest.fn().mockResolvedValue(undefined),
    getLabels: jest.fn().mockResolvedValue(labels),
    getLabelById: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(labels.find((label) => label.id === id))
      ),
    updateLabel: jest.fn().mockResolvedValue(undefined),
    deleteLabel: jest.fn().mockResolvedValue(undefined),
    // Settings
    getSettings: jest.fn().mockResolvedValue([]),
    getSetting: jest.fn().mockResolvedValue(undefined),
    updateSetting: jest.fn().mockResolvedValue(undefined),
    // History
    getHistory: jest.fn().mockResolvedValue([]),
    updateHistory: jest.fn().mockResolvedValue(undefined),
    // AI Model
    getAvailableModels: jest.fn().mockResolvedValue([]),
    uploadCustomModel: jest.fn().mockResolvedValue(undefined),
    selectModel: jest.fn().mockResolvedValue(undefined),
    getSelectedModel: jest.fn().mockResolvedValue(undefined),
    deleteModel: jest.fn().mockResolvedValue(undefined),
  }
}
