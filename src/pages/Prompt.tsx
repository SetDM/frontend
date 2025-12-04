import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Send, Plus, Upload, X, Sparkles } from "lucide-react";

interface TestMessage {
  id: string;
  content: string;
  isUser: boolean;
}

export default function Prompt() {
  const [coachName, setCoachName] = useState("Iris");
  const [description, setDescription] = useState("A friendly fitness coach who helps prospects discover if they're a good fit for transformation coaching.");
  const [instructions, setInstructions] = useState(`You are acting as ${coachName || "the coach"} responding to Instagram DMs. Your goal is to qualify leads for high-ticket fitness coaching.

IMPORTANT: Never reveal you are an AI. Always respond as if you are the coach personally.

Key behaviors:
- Be warm, friendly, and conversational
- Ask about their fitness goals and current situation
- Gauge their budget and timeline naturally
- Guide qualified leads toward booking a call
- Don't be pushy - focus on providing value first`);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Test chat state
  const [testMessages, setTestMessages] = useState<TestMessage[]>([
    {
      id: "1",
      content: "Start by sending a test message to see how your AI responds.",
      isUser: false,
    }
  ]);
  const [testInput, setTestInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    toast.success("AI configuration saved successfully!");
  };

  const handleTestSend = () => {
    if (!testInput.trim()) return;

    const userMessage: TestMessage = {
      id: Date.now().toString(),
      content: testInput,
      isUser: true,
    };

    setTestMessages(prev => [...prev, userMessage]);
    setTestInput("");
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: TestMessage = {
        id: (Date.now() + 1).toString(),
        content: `Hey! Thanks for reaching out 💪 I'd love to learn more about your fitness goals. What's been your biggest challenge lately when it comes to staying consistent with training?`,
        isUser: false,
      };
      setTestMessages(prev => [...prev, aiResponse]);
      setIsThinking(false);
    }, 1500);
  };

  const handleFileUpload = () => {
    // Placeholder for file upload functionality
    setUploadedFiles([...uploadedFiles, "example_conversation.txt"]);
    toast.success("File uploaded successfully!");
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2rem)] flex">
        {/* Left Panel - Configuration */}
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
                {/* Coach Name */}
                <div className="rounded-lg bg-card p-5 shadow-card">
                  <Label htmlFor="coach-name" className="text-base font-medium">Coach Name</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    The AI will respond as this person (never reveals it's an AI)
                  </p>
                  <Input
                    id="coach-name"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>

                {/* Description */}
                <div className="rounded-lg bg-card p-5 shadow-card">
                  <Label htmlFor="description" className="text-base font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    A short description of your AI's purpose
                  </p>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a short description about what this AI does"
                    className="mt-1 min-h-[80px] resize-none"
                  />
                </div>

                {/* Instructions */}
                <div className="rounded-lg bg-card p-5 shadow-card">
                  <Label htmlFor="instructions" className="text-base font-medium">Instructions</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    What does this AI do? How does it behave? What should it avoid doing?
                  </p>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Describe how your AI should communicate, what to do and what NOT to do..."
                    className="mt-1 min-h-[200px] font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Conversations may include part or all of the instructions provided.
                  </p>
                </div>

                {/* Knowledge / File Upload */}
                <div className="rounded-lg bg-card p-5 shadow-card">
                  <Label className="text-base font-medium">Knowledge</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload example conversations to fine-tune your AI's voice and style
                  </p>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm">{file}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button variant="outline" onClick={handleFileUpload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload files
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sticky Save Button */}
          <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
            <div className="max-w-2xl flex justify-end">
              <Button onClick={handleSave} size="lg">
                Save Configuration
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Test Chat */}
        <div className="w-[400px] flex flex-col bg-muted/30">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Preview</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Test Mode</span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
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
                        : "bg-card border border-border"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
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

          {/* Input */}
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
              <Button 
                size="icon" 
                onClick={handleTestSend}
                disabled={!testInput.trim() || isThinking}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
