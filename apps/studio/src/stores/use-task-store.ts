import { Task } from "@vailabel/core"
import { create } from "zustand"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { exceptionMiddleware } from "@/hooks/exception-middleware"
import { sampleTasks } from "@/data/sample-tasks"

type TaskStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void

  tasks: Task[]
  selectedTask: Task | null
  isLoaded: boolean
  loadSampleTasks: () => void
  setSelectedTask: (task: Task | null) => void
  getTasks: () => Task[]
  getTasksByProjectId: (projectId: string) => Promise<Task[]>
  getTaskById: (taskId: string) => Promise<Task | undefined>
  createTask: (task: Task) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  assignTask: (taskId: string, assigneeId: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: string) => Promise<void>
  getTasksByStatus: (status: string) => Task[]
  getTasksByAssignee: (assigneeId: string) => Task[]
  searchTasks: (query: string) => Task[]
}

export const useTaskStore = create<TaskStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),

    tasks: [],
    selectedTask: null,
    isLoaded: false,
    setSelectedTask: (task) => set({ selectedTask: task }),

    loadSampleTasks: () => {
      set({ tasks: sampleTasks, isLoaded: true })
    },

    getTasks: () => {
      const { tasks } = get()
      return tasks
    },

    getTasksByProjectId: async (projectId) => {
      const { data, isLoaded } = get()

      // If no real data exists, load sample tasks for demo
      if (!isLoaded && get().tasks.length === 0) {
        get().loadSampleTasks()
        return get().tasks.filter((task) =>
          projectId ? task.projectId === projectId : true
        )
      }

      try {
        const tasks = await data.fetchTasks(projectId)
        set({ tasks, isLoaded: true })
        return tasks
      } catch {
        // Fallback to sample tasks if API fails
        if (!isLoaded) {
          get().loadSampleTasks()
          return get().tasks.filter((task) =>
            projectId ? task.projectId === projectId : true
          )
        }
        return []
      }
    },

    getTaskById: async (taskId) => {
      const { tasks, data } = get()
      let task = tasks.find((t) => t.id === taskId)
      if (!task) {
        // If not in store, try to fetch all tasks and find it
        const allTasks = await data.fetchTasks("") // Fetch all tasks
        set({ tasks: allTasks })
        task = allTasks.find((t) => t.id === taskId)
      }
      return task
    },

    createTask: async (task) => {
      const { data } = get()
      await data.saveTask(task)
      set((state) => ({
        tasks: [...state.tasks, task],
      }))
    },

    updateTask: async (id, updates) => {
      const { data } = get()
      await data.updateTask(id, updates)
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
      }))
    },

    deleteTask: async (id) => {
      const { data } = get()
      await data.deleteTask(id)
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }))
    },

    assignTask: async (taskId, assigneeId) => {
      await get().updateTask(taskId, { assignedTo: assigneeId })
    },

    updateTaskStatus: async (taskId, status) => {
      await get().updateTask(taskId, { status })
    },

    getTasksByStatus: (status) => {
      const { tasks } = get()
      return tasks.filter((task) => task.status === status)
    },

    getTasksByAssignee: (assigneeId) => {
      const { tasks } = get()
      return tasks.filter((task) => task.assignedTo === assigneeId)
    },

    searchTasks: (query) => {
      const { tasks } = get()
      const searchTerm = query.toLowerCase()
      return tasks.filter(
        (task) =>
          task.name.toLowerCase().includes(searchTerm) ||
          task.description.toLowerCase().includes(searchTerm) ||
          task.status.toLowerCase().includes(searchTerm)
      )
    },
  }))
)
