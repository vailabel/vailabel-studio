import { User } from "@vailabel/core"
import { create } from "zustand"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { exceptionMiddleware } from "@/hooks/exception-middleware"

type UserStoreType = {
  /**
   * User store for managing user data and operations.
   * Provides methods to get, create, update, and delete users.
   */
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void

  users: User[]
  currentUser: User | null
  loading: boolean
  error: string | null

  // User CRUD operations
  getUsers: () => Promise<User[]>
  getUserById: (id: string) => User | undefined
  createUser: (
    user: Omit<User, "id" | "createdAt" | "updatedAt">
  ) => Promise<User>
  updateUser: (id: string, user: Partial<User>) => Promise<User>
  deleteUser: (id: string) => Promise<void>
  setCurrentUser: (user: User | null) => void

  // Sample data loader
  loadSampleUsers: () => void
}

export const useUserStore = create<UserStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),

    users: [],
    currentUser: null,
    loading: false,
    error: null,

    getUsers: async () => {
      try {
        set({ loading: true, error: null })
        const { data } = get()

        // For now, use sample data if no data adapter is available
        if (!data.fetchUsers) {
          const { loadSampleUsers } = get()
          loadSampleUsers()
          return get().users
        }

        const users = await data.fetchUsers()
        set({ users, loading: false })
        return users
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to fetch users",
          loading: false,
        })
        return []
      }
    },

    getUserById: (id) => {
      const { users } = get()
      return users.find((user) => user.id === id)
    },

    createUser: async (userData) => {
      try {
        set({ loading: true, error: null })
        const newUser: User = {
          ...userData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const { data, users } = get()

        // For now, use local state if no data adapter is available
        if (!data.saveUser) {
          set({ users: [...users, newUser], loading: false })
          return newUser
        }

        await data.saveUser(newUser)
        set({ users: [...users, newUser], loading: false })
        return newUser
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to create user",
          loading: false,
        })
        throw error
      }
    },

    updateUser: async (id, userData) => {
      try {
        set({ loading: true, error: null })
        const { data, users } = get()
        const existingUser = users.find((u) => u.id === id)

        if (!existingUser) {
          throw new Error("User not found")
        }

        const updatedUser: User = {
          ...existingUser,
          ...userData,
          updatedAt: new Date(),
        }

        // For now, use local state if no data adapter is available
        if (!data.updateUser) {
          const updatedUsers = users.map((u) => (u.id === id ? updatedUser : u))
          set({ users: updatedUsers, loading: false })
          return updatedUser
        }

        await data.updateUser(id, updatedUser)
        const updatedUsers = users.map((u) => (u.id === id ? updatedUser : u))
        set({ users: updatedUsers, loading: false })
        return updatedUser
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to update user",
          loading: false,
        })
        throw error
      }
    },

    deleteUser: async (id) => {
      try {
        set({ loading: true, error: null })
        const { data, users } = get()

        // For now, use local state if no data adapter is available
        if (!data.deleteUser) {
          const updatedUsers = users.filter((u) => u.id !== id)
          set({ users: updatedUsers, loading: false })
          return
        }

        await data.deleteUser(id)
        const updatedUsers = users.filter((u) => u.id !== id)
        set({ users: updatedUsers, loading: false })
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to delete user",
          loading: false,
        })
        throw error
      }
    },

    setCurrentUser: (user) => set({ currentUser: user }),

    loadSampleUsers: () => {
      const sampleUsers: User[] = [
        {
          id: "1",
          email: "admin@example.com",
          name: "Admin User",
          password: "hashed_password_1",
          role: "admin",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          email: "john.doe@example.com",
          name: "John Doe",
          password: "hashed_password_2",
          role: "annotator",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
        },
        {
          id: "3",
          email: "jane.smith@example.com",
          name: "Jane Smith",
          password: "hashed_password_3",
          role: "reviewer",
          createdAt: new Date("2024-02-01"),
          updatedAt: new Date("2024-02-01"),
        },
        {
          id: "4",
          email: "bob.johnson@example.com",
          name: "Bob Johnson",
          password: "hashed_password_4",
          role: "annotator",
          createdAt: new Date("2024-02-15"),
          updatedAt: new Date("2024-02-15"),
        },
        {
          id: "5",
          email: "alice.brown@example.com",
          name: "Alice Brown",
          password: "hashed_password_5",
          role: "manager",
          createdAt: new Date("2024-03-01"),
          updatedAt: new Date("2024-03-01"),
        },
      ]

      set({ users: sampleUsers })
    },
  }))
)
