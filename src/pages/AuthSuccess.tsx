import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AuthSuccess() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const didHydrate = await refreshUser();
      if (!isMounted) return;
      navigate(didHydrate ? "/" : "/login", { replace: true });
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [refreshUser, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="mb-4 h-8 w-8 animate-spin" />
      <p>Finishing sign in...</p>
    </div>
  );
}
