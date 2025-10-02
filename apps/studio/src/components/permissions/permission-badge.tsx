/**
 * Permission-aware Badge Component
 * Badge that shows user's role or permission status
 */

import React from "react"
import { Badge } from "@/components/ui/badge"
import { usePermissions } from "@/contexts/permission-context"

interface PermissionBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  showRole?: boolean
  showPermissions?: boolean
  maxPermissions?: number
  customLabel?: string
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  showRole = true,
  showPermissions = false,
  maxPermissions = 3,
  customLabel,
  variant = "secondary",
  ...props
}) => {
  const { userRoles, userPermissions } = usePermissions()

  if (customLabel) {
    return (
      <Badge variant={variant} {...props}>
        {customLabel}
      </Badge>
    )
  }

  if (showRole && userRoles.length > 0) {
    const primaryRole = userRoles[0] // Show the first/primary role
    return (
      <Badge variant={variant} {...props}>
        {primaryRole}
      </Badge>
    )
  }

  if (showPermissions && userPermissions.length > 0) {
    const displayPermissions = userPermissions.slice(0, maxPermissions)
    const hasMore = userPermissions.length > maxPermissions

    return (
      <Badge variant={variant} {...props}>
        {displayPermissions.join(", ")}
        {hasMore && ` +${userPermissions.length - maxPermissions} more`}
      </Badge>
    )
  }

  return null
}

interface RoleBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  role: string
  showWhen?: boolean
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showWhen = true,
  variant = "secondary",
  ...props
}) => {
  const { hasRole } = usePermissions()

  if (!showWhen || !hasRole(role)) {
    return null
  }

  return (
    <Badge variant={variant} {...props}>
      {role}
    </Badge>
  )
}

interface PermissionStatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  permission: string
  showWhen?: boolean
  label?: string
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export const PermissionStatusBadge: React.FC<PermissionStatusBadgeProps> = ({
  permission,
  showWhen = true,
  label,
  variant = "secondary",
  ...props
}) => {
  const { hasPermission } = usePermissions()

  if (!showWhen || !hasPermission(permission)) {
    return null
  }

  return (
    <Badge variant={variant} {...props}>
      {label || permission}
    </Badge>
  )
}

// Predefined role badges with styling
export const AdminBadge: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props
) => (
  <RoleBadge role="admin" {...props}>
    <Badge variant="destructive">Admin</Badge>
  </RoleBadge>
)

export const ManagerBadge: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props
) => (
  <RoleBadge role="manager" {...props}>
    <Badge variant="default">Manager</Badge>
  </RoleBadge>
)

export const AnnotatorBadge: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props
) => (
  <RoleBadge role="annotator" {...props}>
    <Badge variant="secondary">Annotator</Badge>
  </RoleBadge>
)

export const ViewerBadge: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props
) => (
  <RoleBadge role="viewer" {...props}>
    <Badge variant="outline">Viewer</Badge>
  </RoleBadge>
)
