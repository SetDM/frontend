import { NavLink as RouterNavLink, NavLinkProps, useLocation } from "react-router-dom";
import { forwardRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/context/UnsavedChangesContext";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
    className?: string;
    activeClassName?: string;
    pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(({ className, activeClassName, pendingClassName, to, onClick, ...props }, ref) => {
    const { hasUnsavedChanges, setPendingNavigation } = useUnsavedChanges();
    const location = useLocation();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        // If navigating to the same page, allow it
        const targetPath = typeof to === "string" ? to : to.pathname || "";
        if (location.pathname === targetPath) {
            onClick?.(e);
            return;
        }

        // If there are unsaved changes, prevent navigation and show dialog
        if (hasUnsavedChanges) {
            e.preventDefault();
            setPendingNavigation(targetPath);
            return;
        }

        onClick?.(e);
    };

    return <RouterNavLink ref={ref} to={to} onClick={handleClick} className={({ isActive, isPending }) => cn(className, isActive && activeClassName, isPending && pendingClassName)} {...props} />;
});

NavLink.displayName = "NavLink";

export { NavLink };
