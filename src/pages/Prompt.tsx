import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { toast } from "sonner";
import { Send, Plus, Sparkles } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { PROMPT_ENDPOINTS } from "@/lib/config";

const DEFAULT_COACH_NAME = "Iris";

type PromptSections = {
  coachName: string;
  leadSequence: string;
  qualificationSequence: string;
  bookingSequence: string;
};

const DEFAULT_SECTIONS: PromptSections = {
  coachName: DEFAULT_COACH_NAME,
  leadSequence: "",
  qualificationSequence: "",
  bookingSequence: ""
};

interface TestMessage {
  id: string;
  content: string;
  isUser: boolean;
  isSystem?: boolean;
}

const INITIAL_TEST_MESSAGES: TestMessage[] = [
  {
    id: "intro",
    content: "Start by sending a test message to see how your AI responds.",
    isUser: false,
    isSystem: true,
  },
];

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function Prompt() {
  usePageTitle("Prompt");
  const { authorizedFetch } = useAuth();

  const [sections, setSections] = useState<PromptSections>(DEFAULT_SECTIONS);
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [testMessages, setTestMessages] = useState<TestMessage[]>(INITIAL_TEST_MESSAGES);
  const [testInput, setTestInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { coachName, leadSequence, qualificationSequence, bookingSequence } = sections;

  const handleSectionChange =
    (key: keyof PromptSections) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setSections((prev) => ({ ...prev, [key]: value }));
    };

  const hydratePrompt = useCallback(async () => {
    try {
      setPromptError(null);
      setIsFetchingPrompt(true);
      const response = await authorizedFetch(PROMPT_ENDPOINTS.user);

      if (!response.ok) {
        throw new Error("Failed to load prompt configuration.");
      }

      const payload = (await response.json()) as { sections?: Partial<PromptSections> };
      const nextSections: PromptSections = {
        coachName: payload.sections?.coachName ?? DEFAULT_COACH_NAME,
        leadSequence: payload.sections?.leadSequence ?? "",
        qualificationSequence: payload.sections?.qualificationSequence ?? "",
        bookingSequence: payload.sections?.bookingSequence ?? ""
      };

      setSections(nextSections);
    } catch (error) {
      console.error(error);
      setPromptError(
        error instanceof Error ? error.message : "Failed to load prompt configuration.",
      );
    } finally {
      setIsFetchingPrompt(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    hydratePrompt();
  }, [hydratePrompt]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await authorizedFetch(PROMPT_ENDPOINTS.user, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sections }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          (payload && typeof payload === "object" && "message" in payload
            ? (payload as { message?: string }).message
            : null) || "Failed to save prompt.";
        throw new Error(message);
      }

      const payload = (await response.json()) as { sections?: Partial<PromptSections> };
      if (payload.sections) {
        setSections({
          coachName: payload.sections.coachName ?? DEFAULT_COACH_NAME,
          leadSequence: payload.sections.leadSequence ?? "",
          qualificationSequence: payload.sections.qualificationSequence ?? "",
          bookingSequence: payload.sections.bookingSequence ?? ""
        });
      }

      toast.success("Prompt updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save prompt.");
    } finally {
      setIsSaving(false);
    }
  };

  const buildHistoryPayload = useCallback(
    (messages: TestMessage[]) =>
      messages
        .filter((msg) => !msg.isSystem)
        .map((msg) => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.content,
        })),
    []
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [testMessages]);

  const handleTestSend = async () => {
    const trimmedInput = testInput.trim();
    if (!trimmedInput || isThinking) {
      return;
    }

    const historyPayload = buildHistoryPayload(testMessages);
    const userMessage: TestMessage = {
      id: createMessageId(),
      content: trimmedInput,
      isUser: true,
    };

    setTestMessages((prev) => [...prev, userMessage]);
    setTestInput("");
    setIsThinking(true);

    try {
      const response = await authorizedFetch(PROMPT_ENDPOINTS.userTest, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedInput,
          history: historyPayload,
          sections,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as { reply?: string; message?: string } | null;

      if (!response.ok) {
        const message = payload?.message || "Failed to run prompt test.";
        throw new Error(message);
      }

      const replyText = payload?.reply?.trim();
      const aiResponse: TestMessage = {
        id: createMessageId(),
        content:
          replyText && replyText.length
            ? replyText
            : "The AI returned an empty response. Double-check your prompt configuration.",
        isUser: false,
      };

      setTestMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to run prompt test.");
      setTestMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          content:
            "We couldn't contact the AI tester. Please verify your internet connection and try again.",
          isUser: false,
          isSystem: true,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2rem)] flex">
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex-1 p-6 overflow-auto pb-24">
            <div className="max-w-2xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Configure Your AI</h1>
                <p className="text-muted-foreground">
                  Set up how your AI communicates with prospects in your voice
                </p>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg bg-card p-5 shadow-card">
                  <Label htmlFor="coach-name" className="text-base font-medium">
                    Coach Name
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    The AI will respond as this person (never reveals it's an AI)
                  </p>
                  <Input
                    id="coach-name"
                    value={coachName}
                    onChange={handleSectionChange("coachName")}
                    placeholder="Your name"
                    className="mt-1"
                    disabled={isFetchingPrompt}
                  />
                </div>

                <div className="rounded-lg bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lead-sequence" className="text-base font-medium">
                      Lead Sequence
                    </Label>
                    <span className="text-xs text-muted-foreground">[lead sequence]</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Customize the conversation flow for new leads.
                  </p>
                  <Textarea
                    id="lead-sequence"
                    value={leadSequence}
                    onChange={handleSectionChange("leadSequence")}
                    placeholder="Define the lead sequence"
                    className="mt-1 min-h-[200px] font-mono text-sm"
                    disabled={isFetchingPrompt}
                  />
                </div>

                <div className="rounded-lg bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="qualification-sequence" className="text-base font-medium">
                      Qualification Sequence
                    </Label>
                    <span className="text-xs text-muted-foreground">[qualification sequence]</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Questions and logic you use to qualify prospects.
                  </p>
                  <Textarea
                    id="qualification-sequence"
                    value={qualificationSequence}
                    onChange={handleSectionChange("qualificationSequence")}
                    placeholder="Define the qualification sequence"
                    className="mt-1 min-h-[200px] font-mono text-sm"
                    disabled={isFetchingPrompt}
                  />
                </div>

                <div className="rounded-lg bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="booking-sequence" className="text-base font-medium">
                      Booking Sequence
                    </Label>
                    <span className="text-xs text-muted-foreground">[booking sequence]</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    The exact script used to move qualified prospects to schedule a call.
                  </p>
                  <Textarea
                    id="booking-sequence"
                    value={bookingSequence}
                    onChange={handleSectionChange("bookingSequence")}
                    placeholder="Define the booking sequence"
                    className="mt-1 min-h-[200px] font-mono text-sm"
                    disabled={isFetchingPrompt}
                  />
                </div>

                {promptError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {promptError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
            <div className="max-w-2xl flex justify-end">
              <Button onClick={handleSave} size="lg" disabled={isSaving || isFetchingPrompt}>
                {isSaving ? "Saving…" : "Save Configuration"}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-[400px] flex flex-col bg-muted/30">
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Preview</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Test Mode</span>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {testMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      message.isUser
                        ? "bg-primary text-primary-foreground"
                        : message.isSystem
                          ? "bg-muted text-muted-foreground border border-dashed border-border"
                          : "bg-card border border-border"
                    }`}
                  >
                    <p className={`text-sm ${message.isSystem ? "italic" : ""}`}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Plus className="h-5 w-5" />
              </Button>
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Send a test message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTestSend();
                  }
                }}
              />
              <Button size="icon" onClick={handleTestSend} disabled={!testInput.trim() || isThinking}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
