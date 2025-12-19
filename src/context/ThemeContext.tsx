import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "setdm-theme";

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
    }
    return "system";
}

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check localStorage first, then fall back to default
        const stored = getStoredTheme();
        return stored !== "system" ? stored : defaultTheme;
    });

    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
        const initial = getStoredTheme();
        if (initial === "system") {
            return getSystemTheme();
        }
        return initial;
    });

    // Apply theme to document
    const applyTheme = useCallback((newTheme: Theme) => {
        const root = document.documentElement;
        const resolved = newTheme === "system" ? getSystemTheme() : newTheme;

        root.classList.remove("light", "dark");
        root.classList.add(resolved);
        setResolvedTheme(resolved);

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute("content", resolved === "dark" ? "hsl(230, 25%, 10%)" : "hsl(240, 20%, 98%)");
        }
    }, []);

    // Set theme and persist to localStorage
    const setTheme = useCallback(
        (newTheme: Theme) => {
            setThemeState(newTheme);
            localStorage.setItem(STORAGE_KEY, newTheme);
            applyTheme(newTheme);
        },
        [applyTheme]
    );

    // Toggle between light and dark (skip system in toggle)
    const toggleTheme = useCallback(() => {
        const newTheme = resolvedTheme === "dark" ? "light" : "dark";
        setTheme(newTheme);
    }, [resolvedTheme, setTheme]);

    // Apply theme on mount and listen for system changes
    useEffect(() => {
        applyTheme(theme);

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (theme === "system") {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme, applyTheme]);

    return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
