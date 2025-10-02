/**
 * Permission Components Export
 * Centralized export for all permission-related components
 */

// Guards
export {
  PermissionGuard,
  ResourceGuard,
  RoleGuard,
  AdminGuard,
  ManagerGuard,
  withPermission,
  withRole,
} from "./permission-guards"

// Buttons
export {
  PermissionButton,
  ReadButton,
  WriteButton,
  DeleteButton,
  ManageButton,
  AdminButton,
  ManagerButton,
} from "./permission-button"

// Badges
export {
  PermissionBadge,
  RoleBadge,
  PermissionStatusBadge,
  AdminBadge,
  ManagerBadge,
  AnnotatorBadge,
  ViewerBadge,
} from "./permission-badge"
