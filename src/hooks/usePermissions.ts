import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, hasAllPermissions, hasAnyPermission, getUserRole, getUserPermissions, canEdit, canManageTeam, canEditSettings, type Permission } from "@/lib/permissions";

export function usePermissions() {
    const { user } = useAuth();

    return useMemo(
        () => ({
            role: getUserRole(user),
            permissions: getUserPermissions(user),
            has: (permission: Permission) => hasPermission(user, permission),
            hasAll: (permissions: Permission[]) => hasAllPermissions(user, permissions),
            hasAny: (permissions: Permission[]) => hasAnyPermission(user, permissions),
            canEdit: canEdit(user),
            canManageTeam: canManageTeam(user),
            canEditSettings: canEditSettings(user),
            isOwner: getUserRole(user) === "owner",
            isAdmin: getUserRole(user) === "admin" || getUserRole(user) === "owner",
            isViewer: getUserRole(user) === "viewer",
        }),
        [user]
    );
}
