import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface UnsavedChangesContextType {
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    onSave: (() => Promise<void>) | null;
    setOnSave: (fn: (() => Promise<void>) | null) => void;
    pendingNavigation: string | null;
    setPendingNavigation: (path: string | null) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [onSave, setOnSaveInternal] = useState<(() => Promise<void>) | null>(null);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

    const setOnSave = useCallback((fn: (() => Promise<void>) | null) => {
        setOnSaveInternal(() => fn);
    }, []);

    return (
        <UnsavedChangesContext.Provider
            value={{
                hasUnsavedChanges,
                setHasUnsavedChanges,
                onSave,
                setOnSave,
                pendingNavigation,
                setPendingNavigation,
            }}
        >
            {children}
        </UnsavedChangesContext.Provider>
    );
}

export function useUnsavedChanges() {
    const context = useContext(UnsavedChangesContext);
    if (!context) {
        throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
    }
    return context;
}
