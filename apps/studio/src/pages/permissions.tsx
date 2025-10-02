import React, { useState } from "react"
import { Shield, Key, Plus, Edit, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import {
  usePermissions as usePermissionsQuery,
  useRoles,
} from "@/hooks/useFastAPIQuery"
import {
  usePermissionManagement,
  useRoleManagement,
} from "@/hooks/usePermissionManagement"
import {
  AdminGuard,
  ManagerGuard,
  AdminBadge,
  ManagerBadge,
  AnnotatorBadge,
  ViewerBadge,
} from "@/components/permissions"

interface PermissionFormData {
  name: string
  description: string
  resource: string
  action: string
}

interface RoleFormData {
  name: string
  description: string
  permissionIds: string[]
}

export default function PermissionsPage() {
  const confirm = useConfirmDialog()

  // Data hooks
  const { data: permissions = [] } = usePermissionsQuery()
  const { data: roles = [] } = useRoles()

  // Management hooks
  const { createPermission, updatePermission, deletePermission } =
    usePermissionManagement()
  const { createRole, updateRole, deleteRole } = useRoleManagement()

  // Local state
  const [searchQuery, setSearchQuery] = useState("")
  const [resourceFilter, setResourceFilter] = useState("all")
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<any>(null)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [permissionForm, setPermissionForm] = useState<PermissionFormData>({
    name: "",
    description: "",
    resource: "",
    action: "",
  })
  const [roleForm, setRoleForm] = useState<RoleFormData>({
    name: "",
    description: "",
    permissionIds: [],
  })

  // Filter permissions
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesResource =
      resourceFilter === "all" || permission.resource === resourceFilter
    return matchesSearch && matchesResource
  })

  // Get unique resources for filter
  const resources = Array.from(new Set(permissions.map((p) => p.resource)))

  // Permission form handlers
  const handlePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPermission) {
        await updatePermission(editingPermission.id, permissionForm)
      } else {
        await createPermission(permissionForm)
      }
      setIsPermissionDialogOpen(false)
      setEditingPermission(null)
      setPermissionForm({ name: "", description: "", resource: "", action: "" })
    } catch (error) {
      console.error("Failed to save permission:", error)
    }
  }

  const handleEditPermission = (permission: any) => {
    setEditingPermission(permission)
    setPermissionForm({
      name: permission.name,
      description: permission.description || "",
      resource: permission.resource,
      action: permission.action,
    })
    setIsPermissionDialogOpen(true)
  }

  const handleDeletePermission = async (permission: any) => {
    const confirmed = await confirm({
      title: "Delete Permission",
      description: `Are you sure you want to delete the permission "${permission.name}"?`,
    })

    if (confirmed) {
      try {
        await deletePermission(permission.id)
      } catch (error) {
        console.error("Failed to delete permission:", error)
      }
    }
  }

  // Role form handlers
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleForm)
      } else {
        await createRole(roleForm)
      }
      setIsRoleDialogOpen(false)
      setEditingRole(null)
      setRoleForm({ name: "", description: "", permissionIds: [] })
    } catch (error) {
      console.error("Failed to save role:", error)
    }
  }

  const handleEditRole = (role: any) => {
    setEditingRole(role)
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions?.map((p: any) => p.id) || [],
    })
    setIsRoleDialogOpen(true)
  }

  const handleDeleteRole = async (role: any) => {
    const confirmed = await confirm({
      title: "Delete Role",
      description: `Are you sure you want to delete the role "${role.name}"?`,
    })

    if (confirmed) {
      try {
        await deleteRole(role.id)
      } catch (error) {
        console.error("Failed to delete role:", error)
      }
    }
  }

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "admin":
        return <AdminBadge />
      case "manager":
        return <ManagerBadge />
      case "annotator":
        return <AnnotatorBadge />
      case "viewer":
        return <ViewerBadge />
      default:
        return <Badge variant="secondary">{roleName}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground">
            Manage user permissions and roles
          </p>
        </div>
        <div className="flex gap-2">
          <ManagerGuard>
            <Button onClick={() => setIsPermissionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Permission
            </Button>
          </ManagerGuard>
          <AdminGuard>
            <Button onClick={() => setIsRoleDialogOpen(true)}>
              <Shield className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </AdminGuard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Permissions
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredPermissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{permission.resource}</Badge>
                      <Badge variant="secondary">{permission.action}</Badge>
                      <span className="font-medium">{permission.name}</span>
                    </div>
                    {permission.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                    )}
                  </div>
                  <ManagerGuard>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditPermission(permission)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeletePermission(permission)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ManagerGuard>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roles Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getRoleBadge(role.name)}
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.permissions?.slice(0, 3).map((permission: any) => (
                        <Badge
                          key={permission.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {permission.name}
                        </Badge>
                      ))}
                      {role.permissions && role.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <AdminGuard>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRole(role)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRole(role)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </AdminGuard>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permission Dialog */}
      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? "Edit Permission" : "Create Permission"}
            </DialogTitle>
            <DialogDescription>
              {editingPermission
                ? "Update the permission details below."
                : "Create a new permission with the details below."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePermissionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resource">Resource</Label>
                <Select
                  value={permissionForm.resource}
                  onValueChange={(value) =>
                    setPermissionForm((prev) => ({ ...prev, resource: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="labels">Labels</SelectItem>
                    <SelectItem value="annotations">Annotations</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                    <SelectItem value="ai_models">AI Models</SelectItem>
                    <SelectItem value="permissions">Permissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="action">Action</Label>
                <Select
                  value={permissionForm.action}
                  onValueChange={(value) =>
                    setPermissionForm((prev) => ({ ...prev, action: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="write">Write</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={permissionForm.name}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., projects:read"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={permissionForm.description}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe what this permission allows..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPermissionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPermission ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Update the role details below."
                : "Create a new role with the details below."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="roleName">Name</Label>
              <Input
                id="roleName"
                value={roleForm.name}
                onChange={(e) =>
                  setRoleForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., manager"
                required
              />
            </div>
            <div>
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe what this role can do..."
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                {permissions.map((permission: any) => (
                  <label
                    key={permission.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={roleForm.permissionIds.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleForm((prev) => ({
                            ...prev,
                            permissionIds: [
                              ...prev.permissionIds,
                              permission.id,
                            ],
                          }))
                        } else {
                          setRoleForm((prev) => ({
                            ...prev,
                            permissionIds: prev.permissionIds.filter(
                              (id) => id !== permission.id
                            ),
                          }))
                        }
                      }}
                    />
                    <span>{permission.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRoleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{editingRole ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
