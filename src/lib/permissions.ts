import type { AuthUser } from "@/types";
import { isTeamMember } from "@/types";

export type Permission =
    | "view:dashboard"
    | "view:messages"
    | "view:prompt"
    | "view:settings"
    | "view:cold-outreach"
    | "edit:messages" // Send messages, approve queued
    | "edit:prompt" // Edit AI prompt/script
    | "edit:settings" // Edit workspace settings
    | "edit:autopilot" // Toggle autopilot
    | "manage:team"; // Invite/remove team members

// Define which roles have which permissions
const ROLE_PERMISSIONS: Record<"admin" | "editor" | "viewer" | "owner", Permission[]> = {
    owner: [
        "view:dashboard",
        "view:messages",
        "view:prompt",
        "view:settings",
        "view:cold-outreach",
        "edit:messages",
        "edit:prompt",
        "edit:settings",
        "edit:autopilot",
        "manage:team",
    ],
    admin: [
        "view:dashboard",
        "view:messages",
        "view:prompt",
        "view:settings",
        "view:cold-outreach",
        "edit:messages",
        "edit:prompt",
        "edit:settings",
        "edit:autopilot",
        "manage:team",
    ],
    editor: [
        "view:dashboard",
        "view:messages",
        "view:prompt",
        "view:settings",
        "view:cold-outreach",
        "edit:messages",
        "edit:prompt",
        "edit:autopilot",
    ],
    viewer: ["view:dashboard", "view:messages", "view:prompt", "view:settings", "view:cold-outreach"],
};

/**
 * Get the role for a user
 */
export const getUserRole = (user: AuthUser | null): "owner" | "admin" | "editor" | "viewer" | null => {
    if (!user) return null;

    // Instagram users are always owners
    if (!isTeamMember(user)) {
        return "owner";
    }

    // Team members have their role
    return user.role;
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (user: AuthUser | null, permission: Permission): boolean => {
    const role = getUserRole(user);
    if (!role) return false;

    return ROLE_PERMISSIONS[role].includes(permission);
};

/**
 * Check if a user has all of the specified permissions
 */
export const hasAllPermissions = (user: AuthUser | null, permissions: Permission[]): boolean => {
    return permissions.every((p) => hasPermission(user, p));
};

/**
 * Check if a user has any of the specified permissions
 */
export const hasAnyPermission = (user: AuthUser | null, permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(user, p));
};

/**
 * Get all permissions for a user
 */
export const getUserPermissions = (user: AuthUser | null): Permission[] => {
    const role = getUserRole(user);
    if (!role) return [];

    return ROLE_PERMISSIONS[role];
};

/**
 * Check if user can edit (is admin, editor, or owner)
 */
export const canEdit = (user: AuthUser | null): boolean => {
    const role = getUserRole(user);
    return role === "owner" || role === "admin" || role === "editor";
};

/**
 * Check if user can manage team (is admin or owner)
 */
export const canManageTeam = (user: AuthUser | null): boolean => {
    return hasPermission(user, "manage:team");
};

/**
 * Check if user can edit settings (is admin or owner)
 */
export const canEditSettings = (user: AuthUser | null): boolean => {
    return hasPermission(user, "edit:settings");
};
