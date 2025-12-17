import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FOLLOWER_ADMIN_ENDPOINTS } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_TOKEN_STORAGE_KEY = "setdm-admin-token";
const FILENAME_PATTERN = /followers_(\d+)/i;

const extractInstagramId = (filename?: string | null) => {
  if (!filename) return "";
  const match = filename.match(FILENAME_PATTERN);
  return match?.[1] ?? "";
};

const formatResult = (result?: Record<string, unknown> | null) => {
  if (!result) return "";
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
};

const AdminFollowers = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { authToken } = useAuth();
  const [adminToken, setAdminToken] = useState("");
  const [ownerInstagramId, setOwnerInstagramId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [limit, setLimit] = useState(25);
  const [lastUploadResult, setLastUploadResult] = useState<Record<string, unknown> | null>(null);
  const [lastEnrichResult, setLastEnrichResult] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (stored) {
      setAdminToken(stored);
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken);
    }
  }, [adminToken]);

  const logMessage = (message: string) => {
    setLogs((prev) => [...prev.slice(-49), `${new Date().toLocaleTimeString()} · ${message}`]);
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    if (file) {
      const inferredId = extractInstagramId(file.name);
      if (inferredId && !ownerInstagramId) {
        setOwnerInstagramId(inferredId);
        logMessage(`Detected Instagram ID ${inferredId} from file name.`);
      }
    }
  };

  const ensureAdminToken = () => {
    if (!adminToken.trim()) {
      toast({
        title: "Admin token required",
        description: "Provide the prompt admin token before making requests.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const ensureAuthSession = () => {
    if (!authToken) {
      toast({
        title: "Sign in required",
        description: "Open the main dashboard and log in before using admin tools.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleUpload = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!ensureAdminToken() || !ensureAuthSession()) return;
    if (!selectedFile) {
      toast({ title: "Select a CSV file", variant: "destructive" });
      return;
    }
    if (!ownerInstagramId.trim()) {
      toast({ title: "Owner Instagram ID missing", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    logMessage("Uploading CSV to server...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("ownerInstagramId", ownerInstagramId.trim());

      const response = await fetch(FOLLOWER_ADMIN_ENDPOINTS.importCsv, {
        method: "POST",
        body: formData,
        headers: {
          "x-admin-token": adminToken.trim(),
          Authorization: `Bearer ${authToken}`,
        },
        credentials: "include",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Import failed");
      }

      setLastUploadResult(payload);
      logMessage(`Stored ${payload.processed ?? 0} rows for ${ownerInstagramId}.`);
      toast({ title: "Import complete", description: `Stored ${payload.processed ?? 0} rows.` });
      resetFileInput();
      setSelectedFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      logMessage(message);
      toast({ title: "Import failed", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEnrich = async () => {
    if (!ensureAdminToken() || !ensureAuthSession()) return;
    if (!ownerInstagramId.trim()) {
      toast({ title: "Owner Instagram ID missing", variant: "destructive" });
      return;
    }

    setIsEnriching(true);
    logMessage(`Requesting enrichment for ${ownerInstagramId}...`);

    try {
      const response = await fetch(FOLLOWER_ADMIN_ENDPOINTS.enrich(ownerInstagramId.trim()), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken.trim(),
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ limit, force: false }),
        credentials: "include",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Enrichment failed");
      }

      setLastEnrichResult(payload);
      logMessage(`Enriched ${payload.updated ?? 0} followers (failures: ${payload.failed ?? 0}).`);
      toast({ title: "Enrichment complete", description: `Updated ${payload.updated ?? 0} followers.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enrichment failed";
      logMessage(message);
      toast({ title: "Enrichment failed", description: message, variant: "destructive" });
    } finally {
      setIsEnriching(false);
    }
  };

  const uploadSummary = useMemo(() => formatResult(lastUploadResult), [lastUploadResult]);
  const enrichSummary = useMemo(() => formatResult(lastEnrichResult), [lastEnrichResult]);

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Admin Tools</p>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Follower Imports</h1>
              <p className="text-muted-foreground">
                Upload CSV exports from the extension and enrich them with fresh Instagram data.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-token">Prompt Admin Token</Label>
              <Input
                id="admin-token"
                type="password"
                placeholder="paste token"
                value={adminToken}
                onChange={(event) => setAdminToken(event.target.value)}
                className="w-full md:w-80"
              />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Follower CSV</Label>
                <Input
                  id="csv-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-id">Owner Instagram ID</Label>
                <Input
                  id="owner-id"
                  placeholder="123456789"
                  value={ownerInstagramId}
                  onChange={(event) => setOwnerInstagramId(event.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? "Uploading..." : "Upload CSV"}
            </Button>
          </form>
          {uploadSummary ? (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Last import response</p>
              <Textarea value={uploadSummary} readOnly className="h-40 font-mono text-xs" />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="enrich-owner">Owner Instagram ID</Label>
              <Input
                id="enrich-owner"
                value={ownerInstagramId}
                placeholder="123456789"
                onChange={(event) => setOwnerInstagramId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Batch size (max 100)</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isNaN(next)) {
                    setLimit(1);
                  } else {
                    setLimit(Math.min(100, Math.max(1, next)));
                  }
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button type="button" variant="secondary" onClick={handleEnrich} disabled={isEnriching}>
              {isEnriching ? "Enriching..." : "Run enrichment"}
            </Button>
          </div>
          {enrichSummary ? (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Last enrichment response</p>
              <Textarea value={enrichSummary} readOnly className="h-40 font-mono text-xs" />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Activity log</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLogs([])}>
              Clear
            </Button>
          </div>
          <Textarea
            className="mt-3 h-48 font-mono text-xs"
            value={logs.length ? logs.join("\n") : "No activity yet."}
            readOnly
          />
        </section>
      </div>
    </AppLayout>
  );
};

export default AdminFollowers;
