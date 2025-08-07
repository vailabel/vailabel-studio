import React, { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  Search,
  Users,
  Mail,
  Shield,
  Calendar,
  Edit,
  Trash2,
  MoreVertical,
  UserPlus,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useUserStore } from "@/stores/use-user-store"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { User } from "@vailabel/core"
import { cn } from "@/lib/utils"

interface UserFormData {
  name: string
  email: string
  role: string
  password?: string
}

const roles = [
  {
    value: "admin",
    label: "Administrator",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  {
    value: "manager",
    label: "Manager",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  {
    value: "reviewer",
    label: "Reviewer",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  {
    value: "annotator",
    label: "Annotator",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
]

export default function UserPage() {
  const { toast } = useToast()
  const confirm = useConfirmDialog()

  // Store
  const {
    users,
    loading,
    error,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    loadSampleUsers,
  } = useUserStore()

  // Local state
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    role: "annotator",
    password: "",
  })

  // Load users on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedUsers = await getUsers()
        if (fetchedUsers.length === 0) {
          loadSampleUsers()
        }
      } catch {
        console.error("Failed to load users")
        loadSampleUsers()
      }
    }
    loadData()
  }, [getUsers, loadSampleUsers])

  // Filter users based on search and role
  const filteredUsers = React.useMemo(() => {
    let filtered = users

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    return filtered
  }, [users, searchQuery, roleFilter])

  // User statistics
  const userStats = React.useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.role === "admin").length
    const managers = users.filter((u) => u.role === "manager").length
    const reviewers = users.filter((u) => u.role === "reviewer").length
    const annotators = users.filter((u) => u.role === "annotator").length

    return { total, admins, managers, reviewers, annotators }
  }, [users])

  // Handlers
  const handleCreateUser = () => {
    setEditingUser(null)
    setFormData({
      name: "",
      email: "",
      role: "annotator",
      password: "",
    })
    setIsDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    const confirmed = await confirm({
      title: "Delete User",
      description: `Are you sure you want to delete "${user?.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      try {
        await deleteUser(userId)
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    }
  }

  const handleSaveUser = async () => {
    try {
      if (!formData.name || !formData.email || !formData.role) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          ...(formData.password && { password: formData.password }),
        })
        toast({
          title: "Success",
          description: "User updated successfully",
        })
      } else {
        // Create new user
        if (!formData.password) {
          toast({
            title: "Error",
            description: "Password is required for new users",
            variant: "destructive",
          })
          return
        }

        await createUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        })
        toast({
          title: "Success",
          description: "User created successfully",
        })
      }

      setIsDialogOpen(false)
      setFormData({
        name: "",
        email: "",
        role: "annotator",
        password: "",
      })
    } catch {
      toast({
        title: "Error",
        description: editingUser
          ? "Failed to update user"
          : "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const getRoleBadge = (role: string) => {
    const roleInfo = roles.find((r) => r.value === role)
    return (
      <Badge className={cn("text-xs", roleInfo?.color)}>
        {roleInfo?.label || role}
      </Badge>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={handleCreateUser} className="w-full sm:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Admins
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {userStats.admins}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Managers
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {userStats.managers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Reviewers
              </p>
              <p className="text-2xl font-bold text-green-600">
                {userStats.reviewers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Annotators
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {userStats.annotators}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading users...</span>
            </div>
          </CardContent>
        </Card>
      ) : filteredUsers.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.createdAt && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(user.createdAt), "MMM dd, yyyy")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">👥</div>
              <h3 className="text-lg font-semibold">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== "all"
                  ? "Try adjusting your filters or search query."
                  : "Get started by adding your first user."}
              </p>
              {!searchQuery && roleFilter === "all" && (
                <Button onClick={handleCreateUser}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First User
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information and role."
                : "Create a new user account with role assignment."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">
                Password {editingUser ? "(leave blank to keep current)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={
                  editingUser ? "Enter new password" : "Enter password"
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={loading}>
              {loading
                ? "Saving..."
                : editingUser
                  ? "Update User"
                  : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
