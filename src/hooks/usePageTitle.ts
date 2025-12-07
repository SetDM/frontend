import { useEffect } from "react";

const APP_NAME = "SetDM";

export function usePageTitle(title?: string | null) {
  useEffect(() => {
    const sanitizedTitle = typeof title === "string" ? title.trim() : "";
    document.title = sanitizedTitle ? `${sanitizedTitle} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
