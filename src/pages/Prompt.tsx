// TODO Vaibhav: POST /api/ai-script to save all script configurations

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Send, Plus, Sparkles, ChevronLeft, ChevronDown, ChevronUp, Link2, GripVertical, X, MessageSquare, Zap, Info, Wand2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useUnsavedChanges } from "@/context/UnsavedChangesContext";
import { PROMPT_ENDPOINTS } from "@/lib/config";
import { StageBadge } from "@/components/StageBadge";
import type { FunnelStage } from "@/types";

type StageContext = "responded" | "lead" | "qualified" | "booking_sent" | "call_booked";

const STAGE_OPTIONS: { value: StageContext; label: string }[] = [
    { value: "responded", label: "Responded" },
    { value: "lead", label: "Lead" },
    { value: "qualified", label: "Qualified" },
    { value: "booking_sent", label: "Booking Sent" },
    { value: "call_booked", label: "Call Booked" },
];

interface TestMessage {
    id: string;
    content: string;
    isUser: boolean;
    isSystem?: boolean;
    stageTag?: FunnelStage;
}

interface FollowupMessage {
    id: string;
    content: string;
    delayValue: string;
    delayUnit: string;
}

interface ObjectionHandler {
    id: string;
    objection: string;
    response: string;
}

interface SequenceBlock {
    script: string;
    followups: FollowupMessage[];
}

interface SequenceData {
    lead: SequenceBlock;
    qualification: SequenceBlock;
    booking: SequenceBlock;
    callBooked: SequenceBlock;
    vslLink: string;
}

interface KeywordSequenceData {
    keyword: string; // Keep for backward compat, but prefer keywords
    keywords: string; // Comma-separated keywords like "CHANGE, FIT, START"
    keywordPhrases: string; // Phrases that also trigger keyword sequence (one per line)
    initialMessage: string;
    followups: FollowupMessage[];
}

type PromptMode = "system" | "custom";

interface PromptConfig {
    coachName: string;
    addToExisting: boolean; // Keep for backward compatibility
    promptMode: PromptMode; // New: system, custom, or combined
    coachingDetails: string;
    styleNotes: string;
    objectionHandlers: ObjectionHandler[];
    sequences: SequenceData;
    keywordSequence: KeywordSequenceData;
    activationPhrases: string; // "Turn on if" - phrases that activate AI → responded sequence (one per line)
}

const createFollowup = (content: string = "", delayValue: string = "1", delayUnit: string = "hours"): FollowupMessage => ({
    id: crypto.randomUUID(),
    content,
    delayValue,
    delayUnit,
});

const DEFAULT_SEQUENCES: SequenceData = {
    lead: { script: "", followups: [] },
    qualification: { script: "", followups: [] },
    booking: { script: "", followups: [] },
    callBooked: { script: "", followups: [] },
    vslLink: "",
};

const DEFAULT_KEYWORD_SEQUENCE: KeywordSequenceData = {
    keyword: "", // backward compat
    keywords: "",
    keywordPhrases: "",
    initialMessage: "",
    followups: [],
};

const DEFAULT_CONFIG: PromptConfig = {
    coachName: "Ayden",
    addToExisting: true, // Keep for backward compatibility
    promptMode: "custom", // Default to custom
    coachingDetails: "",
    styleNotes: "",
    objectionHandlers: [{ id: crypto.randomUUID(), objection: "", response: "" }],
    sequences: DEFAULT_SEQUENCES,
    keywordSequence: DEFAULT_KEYWORD_SEQUENCE,
    activationPhrases: "",
};

const DELAY_UNIT_OPTIONS = ["minutes", "hours"];
const MAX_DELAY_HOURS = 24;

const INITIAL_TEST_MESSAGES: TestMessage[] = [
    {
        id: "intro",
        content: "Start by sending a test message to see how your AI responds.",
        isUser: false,
        isSystem: true,
    },
];

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ============================================================================
// SEQUENCE SECTION COMPONENT (Collapsible with Follow-ups)
// ============================================================================

interface SequenceSectionProps {
    title: string;
    description: string;
    isOpen: boolean;
    onToggle: () => void;
    script: string;
    onScriptChange: (value: string) => void;
    followups: FollowupMessage[];
    onFollowupsChange: (followups: FollowupMessage[]) => void;
    showVslLink?: boolean;
    vslLink?: string;
    onVslLinkChange?: (value: string) => void;
    disabled?: boolean;
}

function SequenceSection({ title, description, isOpen, onToggle, script, onScriptChange, followups, onFollowupsChange, showVslLink, vslLink, onVslLinkChange, disabled }: SequenceSectionProps) {
    const addFollowup = () => {
        onFollowupsChange([...followups, createFollowup()]);
    };

    const removeFollowup = (id: string) => {
        onFollowupsChange(followups.filter((f) => f.id !== id));
    };

    const updateFollowup = (id: string, field: "content" | "delayValue" | "delayUnit", value: string) => {
        onFollowupsChange(
            followups.map((f) => {
                if (f.id !== id) return f;

                const baseFollowup = { ...f, [field]: value };

                // Enforce 24-hour max limit
                const delayValue = parseInt(field === "delayValue" ? value : baseFollowup.delayValue) || 1;
                const delayUnit = field === "delayUnit" ? value : baseFollowup.delayUnit;
                const totalHours = delayUnit === "hours" ? delayValue : delayValue / 60;

                if (totalHours > MAX_DELAY_HOURS) {
                    return { ...baseFollowup, delayValue: delayUnit === "hours" ? "24" : "1440" };
                }

                return baseFollowup;
            })
        );
    };

    const moveFollowup = (index: number, direction: "up" | "down") => {
        const newFollowups = [...followups];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newFollowups.length) return;
        [newFollowups[index], newFollowups[newIndex]] = [newFollowups[newIndex], newFollowups[index]];
        onFollowupsChange(newFollowups);
    };

    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            {/* Collapsible Header - Click to expand/collapse */}
            <CollapsibleTrigger asChild>
                <div className={cn("flex items-center justify-between p-4 rounded-lg bg-card shadow-card cursor-pointer transition-all", isOpen ? "ring-2 ring-primary/20" : "hover:bg-muted/50")}>
                    <div className="min-w-0 flex-1 mr-3">
                        <h3 className="font-medium text-foreground truncate">{title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </div>
            </CollapsibleTrigger>

            {/* Expanded Content */}
            <CollapsibleContent className="mt-2">
                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 space-y-4">
                    {/* Main Script Textarea */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Script</Label>
                        <Textarea
                            value={script}
                            onChange={(e) => onScriptChange(e.target.value)}
                            placeholder="Optional: Add your own script here to customize the conversation flow. Leave empty to use proven scripts only."
                            className="min-h-[120px] sm:min-h-[150px] font-mono text-xs sm:text-sm bg-card"
                            disabled={disabled}
                        />
                    </div>

                    {/* VSL Link Input (only for Call Booked sequence) */}
                    {showVslLink && (
                        <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                <Link2 className="h-3 w-3" /> VSL Link (sent after booking)
                            </Label>
                            <Input value={vslLink} onChange={(e) => onVslLinkChange?.(e.target.value)} placeholder="https://your-vsl-link.com" className="bg-card" disabled={disabled} />
                        </div>
                    )}

                    {/* Follow-ups Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Follow-ups
                            </Label>
                            <Button variant="ghost" size="sm" onClick={addFollowup} className="h-7 text-xs" disabled={disabled}>
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>

                        {/* Empty State */}
                        {followups.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">No follow-ups yet. Click "Add" to create one.</div>
                        ) : (
                            /* Follow-up Cards */
                            <div className="space-y-2">
                                {followups.map((followup, index) => (
                                    <div key={followup.id} className="group relative flex flex-col sm:flex-row gap-2 p-3 bg-card rounded-lg border border-border">
                                        {/* MOBILE: Top bar with reorder buttons and delete */}
                                        <div className="flex sm:hidden items-center justify-between mb-1">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => moveFollowup(index, "up")} disabled={index === 0 || disabled} className="p-1.5 hover:bg-muted rounded disabled:opacity-30">
                                                    <ChevronUp className="h-4 w-4" />
                                                </button>
                                                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                                <button
                                                    onClick={() => moveFollowup(index, "down")}
                                                    disabled={index === followups.length - 1 || disabled}
                                                    className="p-1.5 hover:bg-muted rounded disabled:opacity-30"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <button onClick={() => removeFollowup(followup.id)} disabled={disabled} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* DESKTOP: Left side reorder controls */}
                                        <div className="hidden sm:flex flex-col items-center justify-center gap-1">
                                            <button onClick={() => moveFollowup(index, "up")} disabled={index === 0 || disabled} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            <button
                                                onClick={() => moveFollowup(index, "down")}
                                                disabled={index === followups.length - 1 || disabled}
                                                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>

                                        {/* Follow-up Content */}
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <Textarea
                                                value={followup.content}
                                                onChange={(e) => updateFollowup(followup.id, "content", e.target.value)}
                                                placeholder="Follow-up message..."
                                                className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm resize-none"
                                                disabled={disabled}
                                            />
                                            {/* Delay Selector - matching Response Time style */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">Send after:</span>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={followup.delayUnit === "hours" ? 24 : 1440}
                                                        value={followup.delayValue}
                                                        onChange={(e) => updateFollowup(followup.id, "delayValue", e.target.value)}
                                                        className="w-16 h-8 text-xs bg-background"
                                                        disabled={disabled}
                                                    />
                                                    <Select value={followup.delayUnit} onValueChange={(value) => updateFollowup(followup.id, "delayUnit", value)} disabled={disabled}>
                                                        <SelectTrigger className="w-24 h-8 text-xs bg-background">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {DELAY_UNIT_OPTIONS.map((opt) => (
                                                                <SelectItem key={opt} value={opt}>
                                                                    {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <TooltipProvider delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button type="button" className="inline-flex">
                                                                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs z-[100]">
                                                            <p className="text-sm">
                                                                <strong>24-hour limit:</strong> Instagram only allows messaging within 24 hours of a user's last response. Follow-ups are capped at 24
                                                                hours.
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>

                                        {/* DESKTOP: Delete button (appears on hover) */}
                                        <button
                                            onClick={() => removeFollowup(followup.id)}
                                            disabled={disabled}
                                            className="hidden sm:block p-1 hover:bg-destructive/10 hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity self-start"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

// ============================================================================
// KEYWORD SEQUENCE SECTION COMPONENT (Distinct styling)
// ============================================================================

interface KeywordSequenceSectionProps {
    isOpen: boolean;
    onToggle: () => void;
    keywords: string;
    onKeywordsChange: (value: string) => void;
    keywordPhrases: string;
    onKeywordPhrasesChange: (value: string) => void;
    initialMessage: string;
    onInitialMessageChange: (value: string) => void;
    followups: FollowupMessage[];
    onFollowupsChange: (followups: FollowupMessage[]) => void;
    disabled?: boolean;
}

function KeywordSequenceSection({
    isOpen,
    onToggle,
    keywords,
    onKeywordsChange,
    keywordPhrases,
    onKeywordPhrasesChange,
    initialMessage,
    onInitialMessageChange,
    followups,
    onFollowupsChange,
    disabled,
}: KeywordSequenceSectionProps) {
    const addFollowup = () => {
        onFollowupsChange([...followups, createFollowup()]);
    };

    const removeFollowup = (id: string) => {
        onFollowupsChange(followups.filter((f) => f.id !== id));
    };

    const updateFollowup = (id: string, field: "content" | "delayValue" | "delayUnit", value: string) => {
        onFollowupsChange(
            followups.map((f) => {
                if (f.id !== id) return f;

                const baseFollowup = { ...f, [field]: value };
                const delayValue = parseInt(field === "delayValue" ? value : baseFollowup.delayValue) || 1;
                const delayUnit = field === "delayUnit" ? value : baseFollowup.delayUnit;
                const totalHours = delayUnit === "hours" ? delayValue : delayValue / 60;

                if (totalHours > MAX_DELAY_HOURS) {
                    return { ...baseFollowup, delayValue: delayUnit === "hours" ? "24" : "1440" };
                }

                return baseFollowup;
            })
        );
    };

    const moveFollowup = (index: number, direction: "up" | "down") => {
        const newFollowups = [...followups];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newFollowups.length) return;
        [newFollowups[index], newFollowups[newIndex]] = [newFollowups[newIndex], newFollowups[index]];
        onFollowupsChange(newFollowups);
    };

    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            <CollapsibleTrigger asChild>
                <div
                    className={cn(
                        "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all border-2",
                        isOpen ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20" : "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10"
                    )}
                >
                    <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <h3 className="font-medium text-foreground truncate">Keyword Sequence</h3>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">Triggered when prospect responds with your keyword (e.g., FIT, COACH)</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-amber-600" /> : <ChevronDown className="h-4 w-4 shrink-0 text-amber-600" />}
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2">
                <div className="p-3 sm:p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-4">
                    {/* Keywords Input (comma-separated) */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Trigger Keywords</Label>
                        <Input
                            value={keywords}
                            onChange={(e) => onKeywordsChange(e.target.value.toUpperCase())}
                            placeholder="e.g., CHANGE, FIT, START, COACH"
                            className="bg-card uppercase font-semibold text-amber-600"
                            disabled={disabled}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Comma-separated keywords. When a prospect DMs any of these, this sequence starts.</p>
                    </div>

                    {/* Keyword Phrases (one per line) */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Trigger Phrases</Label>
                        <Textarea
                            value={keywordPhrases}
                            onChange={(e) => onKeywordPhrasesChange(e.target.value)}
                            placeholder={"e.g., for story replies asking country/age:\nUSA\n25\nCanada\n30"}
                            className="min-h-[80px] font-mono text-xs sm:text-sm bg-card"
                            disabled={disabled}
                        />
                        <p className="text-xs text-muted-foreground mt-1">One phrase per line. Use this for story/reel replies where users respond with their country, age, etc.</p>
                    </div>

                    {/* Initial Message Textarea */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Initial Message</Label>
                        <Textarea
                            value={initialMessage}
                            onChange={(e) => onInitialMessageChange(e.target.value)}
                            placeholder="e.g., Awesome, it is great to see you are making fitness a priority. I just have a couple questions to see if I can help you, then we can move forward. Sound good?"
                            className="min-h-[100px] sm:min-h-[120px] font-mono text-xs sm:text-sm bg-card"
                            disabled={disabled}
                        />
                    </div>

                    {/* Follow-ups Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Follow-ups
                            </Label>
                            <Button variant="ghost" size="sm" onClick={addFollowup} className="h-7 text-xs" disabled={disabled}>
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>

                        {followups.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-amber-500/30 rounded-lg">No follow-ups yet. Click "Add" to create one.</div>
                        ) : (
                            <div className="space-y-2">
                                {followups.map((followup, index) => (
                                    <div key={followup.id} className="group relative flex flex-col sm:flex-row gap-2 p-3 bg-card rounded-lg border border-amber-500/20">
                                        {/* MOBILE: Top bar */}
                                        <div className="flex sm:hidden items-center justify-between mb-1">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => moveFollowup(index, "up")} disabled={index === 0 || disabled} className="p-1.5 hover:bg-muted rounded disabled:opacity-30">
                                                    <ChevronUp className="h-4 w-4" />
                                                </button>
                                                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                                <button
                                                    onClick={() => moveFollowup(index, "down")}
                                                    disabled={index === followups.length - 1 || disabled}
                                                    className="p-1.5 hover:bg-muted rounded disabled:opacity-30"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <button onClick={() => removeFollowup(followup.id)} disabled={disabled} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* DESKTOP: Left side reorder */}
                                        <div className="hidden sm:flex flex-col items-center justify-center gap-1">
                                            <button onClick={() => moveFollowup(index, "up")} disabled={index === 0 || disabled} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            <button
                                                onClick={() => moveFollowup(index, "down")}
                                                disabled={index === followups.length - 1 || disabled}
                                                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>

                                        {/* Follow-up Content */}
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <Textarea
                                                value={followup.content}
                                                onChange={(e) => updateFollowup(followup.id, "content", e.target.value)}
                                                placeholder="Follow-up message..."
                                                className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm resize-none"
                                                disabled={disabled}
                                            />
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">Send after:</span>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={followup.delayUnit === "hours" ? 24 : 1440}
                                                        value={followup.delayValue}
                                                        onChange={(e) => updateFollowup(followup.id, "delayValue", e.target.value)}
                                                        className="w-16 h-8 text-xs bg-background"
                                                        disabled={disabled}
                                                    />
                                                    <Select value={followup.delayUnit} onValueChange={(value) => updateFollowup(followup.id, "delayUnit", value)} disabled={disabled}>
                                                        <SelectTrigger className="w-24 h-8 text-xs bg-background">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {DELAY_UNIT_OPTIONS.map((opt) => (
                                                                <SelectItem key={opt} value={opt}>
                                                                    {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <TooltipProvider delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button type="button" className="inline-flex">
                                                                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs z-[100]">
                                                            <p className="text-sm">
                                                                <strong>24-hour limit:</strong> Instagram only allows messaging within 24 hours of a user's last response.
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>

                                        {/* DESKTOP: Delete button */}
                                        <button
                                            onClick={() => removeFollowup(followup.id)}
                                            disabled={disabled}
                                            className="hidden sm:block p-1 hover:bg-destructive/10 hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity self-start"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Flow indicator */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            After this message, the conversation flows into <span className="font-medium text-foreground">Qualification → Booking → Call Booked</span> sequences
                        </p>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

// ============================================================================
// MAIN PROMPT COMPONENT
// ============================================================================

export default function Prompt() {
    usePageTitle("Prompt");
    const { authorizedFetch, activeWorkspaceId } = useAuth();

    // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------

    const [config, setConfig] = useState<PromptConfig>(DEFAULT_CONFIG);
    const [isFetchingPrompt, setIsFetchingPrompt] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);

    // Track original config to detect unsaved changes
    const originalConfigRef = useRef<string>("");
    const hasUnsavedChanges = originalConfigRef.current !== "" && originalConfigRef.current !== JSON.stringify(config);

    // Sync unsaved changes state with context
    const { setHasUnsavedChanges, setOnSave } = useUnsavedChanges();

    // Mobile: Whether to show the test chat panel
    const [showPreview, setShowPreview] = useState(false);

    // Which sequence sections are expanded
    const [openSections, setOpenSections] = useState<string[]>([]);

    // Keyword section open state
    const [keywordSectionOpen, setKeywordSectionOpen] = useState(false);

    // Whether behavior preferences section is expanded
    const [behaviorOpen, setBehaviorOpen] = useState(false);

    // Current stage context for the test chat (affects AI responses)
    const [stageContext, setStageContext] = useState<StageContext>("responded");

    // Generate from Chats dialog state
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [chatTextInput, setChatTextInput] = useState("");
    const [businessDescInput, setBusinessDescInput] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Test chat state
    const [testMessages, setTestMessages] = useState<TestMessage[]>(INITIAL_TEST_MESSAGES);
    const [testInput, setTestInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // -------------------------------------------------------------------------
    // API INTEGRATION
    // -------------------------------------------------------------------------

    const resetPromptState = useCallback(() => {
        setConfig({ ...DEFAULT_CONFIG });
        setTestMessages([...INITIAL_TEST_MESSAGES]);
        setTestInput("");
        setPromptError(null);
        setStageContext("responded");
        setIsThinking(false);
    }, []);

    const hydratePrompt = useCallback(
        async (signal?: AbortSignal) => {
            if (!activeWorkspaceId) {
                setIsFetchingPrompt(false);
                return;
            }

            try {
                setPromptError(null);
                setIsFetchingPrompt(true);
                const response = await authorizedFetch(PROMPT_ENDPOINTS.user, { signal });

                if (!response.ok) {
                    throw new Error("Failed to load prompt configuration.");
                }

                const payload = (await response.json()) as { config?: Partial<PromptConfig> };

                if (signal?.aborted) {
                    return;
                }

                if (payload.config) {
                    // Determine promptMode from existing data (backward compatibility)
                    // Treat "combined" as "custom" since we removed combined mode
                    let promptMode: PromptMode = "custom";
                    if (payload.config?.promptMode === "system") {
                        promptMode = "system";
                    } else if (payload.config?.promptMode === "custom" || payload.config?.promptMode === "combined") {
                        promptMode = "custom";
                    } else if (payload.config?.addToExisting === false) {
                        promptMode = "custom";
                    }

                    const loadedConfig: PromptConfig = {
                        ...DEFAULT_CONFIG,
                        coachName: payload.config?.coachName || DEFAULT_CONFIG.coachName,
                        addToExisting: false, // Deprecated, always false now
                        promptMode,
                        coachingDetails: payload.config?.coachingDetails || DEFAULT_CONFIG.coachingDetails,
                        styleNotes: payload.config?.styleNotes || DEFAULT_CONFIG.styleNotes,
                        objectionHandlers: payload.config?.objectionHandlers?.length ? payload.config.objectionHandlers : [{ id: crypto.randomUUID(), objection: "", response: "" }],
                        sequences: {
                            lead: payload.config?.sequences?.lead || DEFAULT_SEQUENCES.lead,
                            qualification: payload.config?.sequences?.qualification || DEFAULT_SEQUENCES.qualification,
                            booking: payload.config?.sequences?.booking || DEFAULT_SEQUENCES.booking,
                            callBooked: payload.config?.sequences?.callBooked || DEFAULT_SEQUENCES.callBooked,
                            vslLink: payload.config?.sequences?.vslLink || DEFAULT_SEQUENCES.vslLink,
                        },
                        keywordSequence: {
                            ...DEFAULT_KEYWORD_SEQUENCE,
                            ...payload.config?.keywordSequence,
                            // Merge keyword into keywords for backward compat
                            keywords: payload.config?.keywordSequence?.keywords || payload.config?.keywordSequence?.keyword || "",
                        },
                        activationPhrases: payload.config?.activationPhrases || "",
                    };
                    setConfig(loadedConfig);
                    // Store original config for change detection
                    originalConfigRef.current = JSON.stringify(loadedConfig);
                }
            } catch (error) {
                if (signal?.aborted) {
                    return;
                }
                console.error(error);
                setPromptError(error instanceof Error ? error.message : "Failed to load prompt configuration.");
            } finally {
                if (!signal?.aborted) {
                    setIsFetchingPrompt(false);
                }
            }
        },
        [activeWorkspaceId, authorizedFetch]
    );

    useEffect(() => {
        const abortController = new AbortController();
        setIsFetchingPrompt(true);
        resetPromptState();

        if (!activeWorkspaceId) {
            setIsFetchingPrompt(false);
            return () => abortController.abort();
        }

        hydratePrompt(abortController.signal);

        return () => {
            abortController.abort();
        };
    }, [activeWorkspaceId, hydratePrompt, resetPromptState]);

    // -------------------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------------------

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const response = await authorizedFetch(PROMPT_ENDPOINTS.user, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ config }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const message = (payload && typeof payload === "object" && "message" in payload ? (payload as { message?: string }).message : null) || "Failed to save prompt.";
                throw new Error(message);
            }

            // Update original config after successful save
            originalConfigRef.current = JSON.stringify(config);

            toast.success("Configuration saved!", {
                position: "top-right",
            });
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to save prompt.");
        } finally {
            setIsSaving(false);
        }
    }, [authorizedFetch, config]);

    // Analyze pasted chats and generate sequences
    const handleAnalyzeChats = async () => {
        if (!chatTextInput || chatTextInput.trim().length < 50) {
            toast.error("Please paste at least a few messages from your conversations");
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await authorizedFetch(`${PROMPT_ENDPOINTS.user.replace("/user", "/analyze-chats")}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatText: chatTextInput,
                    coachName: config.coachName,
                    businessDescription: businessDescInput,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || "Failed to analyze chats");
            }

            const result = await response.json();
            const data = result.data;

            // Update config with generated sequences
            setConfig((prev) => ({
                ...prev,
                coachName: data.coachName || prev.coachName,
                coachingDetails: data.coachingDetails || prev.coachingDetails,
                styleNotes: data.styleNotes || prev.styleNotes,
                sequences: {
                    ...prev.sequences,
                    lead: data.sequences?.lead?.script ? { ...prev.sequences.lead, script: data.sequences.lead.script } : prev.sequences.lead,
                    qualification: data.sequences?.qualification?.script ? { ...prev.sequences.qualification, script: data.sequences.qualification.script } : prev.sequences.qualification,
                    booking: data.sequences?.booking?.script ? { ...prev.sequences.booking, script: data.sequences.booking.script } : prev.sequences.booking,
                    callBooked: data.sequences?.callBooked?.script ? { ...prev.sequences.callBooked, script: data.sequences.callBooked.script } : prev.sequences.callBooked,
                },
                objectionHandlers:
                    data.objectionHandlers?.length > 0
                        ? data.objectionHandlers.map((h: { objection: string; response: string }) => ({ id: crypto.randomUUID(), objection: h.objection, response: h.response }))
                        : prev.objectionHandlers,
            }));

            toast.success("Sequences generated! Review and save your changes.");
            setGenerateDialogOpen(false);
            setChatTextInput("");
            setBusinessDescInput("");

            // Expand the sequence sections so user can see what was generated
            setOpenSections(["lead", "qualification", "booking"]);
            setBehaviorOpen(true);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to analyze chats");
        } finally {
            setIsAnalyzing(false);
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
        requestAnimationFrame(() => {
            endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
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
                    config,
                    stageTag: stageContext,
                }),
            });

            const payload = (await response.json().catch(() => null)) as { reply?: string; message?: string } | null;

            if (!response.ok) {
                const message = payload?.message || "Failed to run prompt test.";
                throw new Error(message);
            }

            const replyText = payload?.reply?.trim();
            const aiResponse: TestMessage = {
                id: createMessageId(),
                content: replyText && replyText.length ? replyText : "The AI returned an empty response. Double-check your prompt configuration.",
                isUser: false,
                stageTag: stageContext as FunnelStage,
            };

            setTestMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to run prompt test.");
            setTestMessages((prev) => [
                ...prev,
                {
                    id: createMessageId(),
                    content: "We couldn't contact the AI tester. Please verify your internet connection and try again.",
                    isUser: false,
                    isSystem: true,
                },
            ]);
        } finally {
            setIsThinking(false);
        }
    };

    /**
     * Toggle a sequence section open/closed
     */
    const toggleSection = (section: string) => {
        setOpenSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));
    };

    /**
     * Update the main script for a sequence
     */
    const updateSequenceScript = (key: keyof Omit<SequenceData, "vslLink">, script: string) => {
        setConfig((prev) => ({
            ...prev,
            sequences: {
                ...prev.sequences,
                [key]: { ...prev.sequences[key], script },
            },
        }));
    };

    /**
     * Update the follow-ups for a sequence
     */
    const updateSequenceFollowups = (key: keyof Omit<SequenceData, "vslLink">, followups: FollowupMessage[]) => {
        setConfig((prev) => ({
            ...prev,
            sequences: {
                ...prev.sequences,
                [key]: { ...prev.sequences[key], followups },
            },
        }));
    };

    // -------------------------------------------------------------------------
    // UNSAVED CHANGES PROTECTION
    // -------------------------------------------------------------------------

    // Handle browser refresh/close with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Sync unsaved changes state with context for in-app navigation blocking
    useEffect(() => {
        setHasUnsavedChanges(hasUnsavedChanges);
    }, [hasUnsavedChanges, setHasUnsavedChanges]);

    // Register save function with context
    useEffect(() => {
        setOnSave(handleSave);
        return () => setOnSave(null);
    }, [setOnSave, handleSave]);

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------

    return (
        // Note: hideMobileHeader hides navbar when in preview mode on mobile
        <AppLayout hideMobileHeader={showPreview}>
            <div className="h-screen flex flex-col lg:flex-row">
                {/* ================================================================
            LEFT PANEL - CONFIGURATION
            Contains all the script editing controls
        ================================================================ */}
                <div
                    className={cn(
                        "flex-1 flex flex-col lg:border-r border-border min-h-0",
                        // On mobile, hide this panel when showing preview
                        showPreview && "hidden lg:flex"
                    )}
                >
                    {/* Sticky Top Bar with Save Button */}
                    <div className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <h1 className="text-base font-semibold text-foreground sm:text-lg">AI Script</h1>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleSave} size="sm" className="h-8 px-3" disabled={isSaving || isFetchingPrompt}>
                                {isSaving ? "Saving…" : "Save changes"}
                            </Button>
                            {/* Mobile: Button to show preview */}
                            <Button variant="outline" size="sm" className="lg:hidden h-8 px-3" onClick={() => setShowPreview(true)}>
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                                Preview
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 px-3 py-4 sm:p-6 overflow-auto">
                        <div className="max-w-2xl mx-auto">
                            {/* Page Subtitle */}
                            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Configure how your AI talks to prospects</p>

                            {/* Coach Name Input */}
                            <div className="rounded-lg bg-card p-3 sm:p-4 shadow-card mb-3 sm:mb-4">
                                <Label htmlFor="coach-name" className="text-sm font-medium">
                                    Coach Name
                                </Label>
                                <p className="text-xs text-muted-foreground mb-2">AI responds as this person (never reveals it's an AI)</p>
                                <Input
                                    id="coach-name"
                                    value={config.coachName}
                                    onChange={(e) => setConfig((prev) => ({ ...prev, coachName: e.target.value }))}
                                    placeholder="Your name"
                                    className="text-sm"
                                    disabled={isFetchingPrompt}
                                />
                            </div>

                            {/* 
                SCRIPT MODE SELECTOR
                
                Three options:
                - System: Use our proven scripts only
                - Custom: Use your scripts only
                - Combined: Merge your scripts with our proven patterns
              */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span className="text-sm sm:text-base font-semibold">Script Mode</span>
                                    <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="inline-flex">
                                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs z-[100]">
                                                <p className="text-sm">
                                                    Choose how AI scripts are used. <strong>Proven scripts</strong> are battle-tested conversation flows trained on 10,000+ successful conversations.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfig((prev) => ({ ...prev, promptMode: "system", addToExisting: false }))}
                                        disabled={isFetchingPrompt}
                                        className={cn(
                                            "p-3 rounded-lg border-2 text-left transition-all",
                                            config.promptMode === "system" ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <div className="font-medium text-sm">Proven Only</div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Use our battle-tested scripts</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfig((prev) => ({ ...prev, promptMode: "custom", addToExisting: false }))}
                                        disabled={isFetchingPrompt}
                                        className={cn(
                                            "p-3 rounded-lg border-2 text-left transition-all",
                                            config.promptMode === "custom" ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <div className="font-medium text-sm">Custom Only</div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Full control with your scripts</p>
                                    </button>
                                </div>

                                {/* Generate from Chats Button */}
                                {config.promptMode === "custom" && (
                                    <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                                        <DialogTrigger asChild>
                                            <button
                                                type="button"
                                                className="mt-3 w-full p-3 rounded-lg border-2 border-dashed border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Wand2 className="h-4 w-4 text-purple-500" />
                                                    <span className="font-medium text-sm text-purple-600 dark:text-purple-400">Generate from Chats</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">Paste your conversations and AI will create your scripts</p>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <Wand2 className="h-5 w-5 text-purple-500" />
                                                    Generate Scripts from Your Chats
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Paste your best sales conversations below. AI will analyze them and create structured scripts that match your style.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4 mt-4">
                                                <div>
                                                    <Label className="text-sm font-medium mb-2 block">What do you do? (optional)</Label>
                                                    <Input
                                                        value={businessDescInput}
                                                        onChange={(e) => setBusinessDescInput(e.target.value)}
                                                        placeholder="e.g., Online fitness coaching, weight loss programs for busy professionals"
                                                        disabled={isAnalyzing}
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="text-sm font-medium mb-2 block">Paste your chat conversations</Label>
                                                    <Textarea
                                                        value={chatTextInput}
                                                        onChange={(e) => setChatTextInput(e.target.value)}
                                                        placeholder={`Just copy-paste your Instagram DM conversations here.

No need to format them - paste them exactly as they appear. The AI will figure out who's the coach and who's the prospect.

Paste as many conversations as you want - the more examples, the better the AI can learn your style.`}
                                                        className="min-h-[250px] font-mono text-xs"
                                                        disabled={isAnalyzing}
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-1">Tip: Include conversations that show how you open, qualify, handle objections, and book calls.</p>
                                                </div>

                                                <Button onClick={handleAnalyzeChats} disabled={isAnalyzing || chatTextInput.trim().length < 50} className="w-full">
                                                    {isAnalyzing ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Analyzing your conversations...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="h-4 w-4 mr-2" />
                                                            Generate Scripts
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>

                            {/* Keyword Sequence - Distinct section for keyword triggers */}
                            <div className="mb-4">
                                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    Story/Reel Keyword Trigger
                                </p>
                                <KeywordSequenceSection
                                    isOpen={keywordSectionOpen}
                                    onToggle={() => setKeywordSectionOpen(!keywordSectionOpen)}
                                    keywords={config.keywordSequence.keywords || config.keywordSequence.keyword || ""}
                                    onKeywordsChange={(v) => setConfig((prev) => ({ ...prev, keywordSequence: { ...prev.keywordSequence, keywords: v, keyword: v } }))}
                                    keywordPhrases={config.keywordSequence.keywordPhrases || ""}
                                    onKeywordPhrasesChange={(v) => setConfig((prev) => ({ ...prev, keywordSequence: { ...prev.keywordSequence, keywordPhrases: v } }))}
                                    initialMessage={config.keywordSequence.initialMessage}
                                    onInitialMessageChange={(v) => setConfig((prev) => ({ ...prev, keywordSequence: { ...prev.keywordSequence, initialMessage: v } }))}
                                    followups={config.keywordSequence.followups}
                                    onFollowupsChange={(f) => setConfig((prev) => ({ ...prev, keywordSequence: { ...prev.keywordSequence, followups: f } }))}
                                    disabled={isFetchingPrompt}
                                />
                            </div>

                            {/* ACTIVATION PHRASES / "TURN ON IF" SECTION */}
                            <div className="rounded-lg bg-card shadow-card overflow-hidden mb-4">
                                <div className="p-4 border-b border-border">
                                    <h3 className="font-medium text-foreground flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        Turn On AI If...
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">AI will activate and start the responded sequence when prospect says something matching these phrases</p>
                                </div>
                                <div className="p-4">
                                    <Textarea
                                        value={config.activationPhrases || ""}
                                        onChange={(e) => setConfig((prev) => ({ ...prev, activationPhrases: e.target.value }))}
                                        placeholder={"e.g., one phrase per line:\nI want to lose weight\nI'm looking for a coach\nI need help with my diet\nI'm fat\nhelp me get in shape"}
                                        className="min-h-[100px] font-mono text-xs sm:text-sm bg-card"
                                        disabled={isFetchingPrompt}
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        One phrase per line. The AI will check incoming messages against these. If matched, autopilot turns on and sets stage to "responded".
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                {/* BEHAVIOR PREFERENCES SECTION - Collapsible */}
                                <div className="rounded-lg bg-card shadow-card overflow-hidden">
                                    <button onClick={() => setBehaviorOpen(!behaviorOpen)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="text-left">
                                            <h3 className="font-medium text-foreground">Behavior Preferences</h3>
                                            <p className="text-xs text-muted-foreground">Fine-tune how your AI communicates</p>
                                        </div>
                                        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", behaviorOpen && "rotate-180")} />
                                    </button>

                                    {behaviorOpen && (
                                        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                                            {/* Coach Details */}
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">About You</Label>
                                                <Textarea
                                                    value={config.coachingDetails}
                                                    onChange={(e) => setConfig((prev) => ({ ...prev, coachingDetails: e.target.value }))}
                                                    placeholder={"E.g. Former D1 basketball player, 10 years coaching\nSpecialize in mindset and performance\nWorked with pro athletes and busy execs"}
                                                    className="min-h-[80px] text-sm"
                                                    disabled={isFetchingPrompt}
                                                />
                                            </div>

                                            {/* Style Notes */}
                                            <div>
                                                <Label className="text-sm font-medium mb-2 block">Style</Label>
                                                <Textarea
                                                    value={config.styleNotes}
                                                    onChange={(e) => setConfig((prev) => ({ ...prev, styleNotes: e.target.value }))}
                                                    placeholder={"Don't use emojis\nKeep messages short and casual\nAlways be friendly"}
                                                    className="min-h-[80px] text-sm"
                                                    disabled={isFetchingPrompt}
                                                />
                                            </div>

                                            {/* Objection Handlers */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <Label className="text-sm font-medium">Objection Handlers</Label>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setConfig((prev) => ({
                                                                ...prev,
                                                                objectionHandlers: [...prev.objectionHandlers, { id: crypto.randomUUID(), objection: "", response: "" }],
                                                            }))
                                                        }
                                                        className="h-7 text-xs"
                                                        disabled={isFetchingPrompt}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" /> Add
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    {config.objectionHandlers.map((handler) => (
                                                        <div key={handler.id} className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                                                            <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                                                                <div className="flex-1">
                                                                    <Label className="text-xs text-muted-foreground mb-1 block sm:hidden">If they say...</Label>
                                                                    <Input
                                                                        value={handler.objection}
                                                                        onChange={(e) =>
                                                                            setConfig((prev) => ({
                                                                                ...prev,
                                                                                objectionHandlers: prev.objectionHandlers.map((h) => (h.id === handler.id ? { ...h, objection: e.target.value } : h)),
                                                                            }))
                                                                        }
                                                                        placeholder="If they say..."
                                                                        className="text-sm bg-card"
                                                                        disabled={isFetchingPrompt}
                                                                    />
                                                                </div>
                                                                <div className="hidden sm:flex items-center text-muted-foreground text-sm">→</div>
                                                                <div className="flex-1">
                                                                    <Label className="text-xs text-muted-foreground mb-1 block sm:hidden">Reply with...</Label>
                                                                    <Input
                                                                        value={handler.response}
                                                                        onChange={(e) =>
                                                                            setConfig((prev) => ({
                                                                                ...prev,
                                                                                objectionHandlers: prev.objectionHandlers.map((h) => (h.id === handler.id ? { ...h, response: e.target.value } : h)),
                                                                            }))
                                                                        }
                                                                        placeholder="Reply with..."
                                                                        className="text-sm bg-card"
                                                                        disabled={isFetchingPrompt}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {config.objectionHandlers.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        setConfig((prev) => ({
                                                                            ...prev,
                                                                            objectionHandlers: prev.objectionHandlers.filter((h) => h.id !== handler.id),
                                                                        }))
                                                                    }
                                                                    className="h-8 w-8 shrink-0 self-end sm:self-center text-muted-foreground hover:text-destructive"
                                                                    disabled={isFetchingPrompt}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Core Sequences Container */}
                                <div className="rounded-lg border border-border p-4 space-y-2 sm:space-y-3">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Core Sequences</h4>

                                    {/* Lead Sequence Section */}
                                    <SequenceSection
                                        title="Lead Sequence"
                                        description="Initial conversation flow for new leads"
                                        isOpen={openSections.includes("lead")}
                                        onToggle={() => toggleSection("lead")}
                                        script={config.sequences.lead.script}
                                        onScriptChange={(v) => updateSequenceScript("lead", v)}
                                        followups={config.sequences.lead.followups}
                                        onFollowupsChange={(f) => updateSequenceFollowups("lead", f)}
                                        disabled={isFetchingPrompt}
                                    />

                                    {/* Qualification Sequence Section */}
                                    <SequenceSection
                                        title="Qualification Sequence"
                                        description="Questions to qualify prospects"
                                        isOpen={openSections.includes("qualification")}
                                        onToggle={() => toggleSection("qualification")}
                                        script={config.sequences.qualification.script}
                                        onScriptChange={(v) => updateSequenceScript("qualification", v)}
                                        followups={config.sequences.qualification.followups}
                                        onFollowupsChange={(f) => updateSequenceFollowups("qualification", f)}
                                        disabled={isFetchingPrompt}
                                    />

                                    {/* Booking Sequence Section */}
                                    <SequenceSection
                                        title="Booking Sequence"
                                        description="Script to schedule calls"
                                        isOpen={openSections.includes("booking")}
                                        onToggle={() => toggleSection("booking")}
                                        script={config.sequences.booking.script}
                                        onScriptChange={(v) => updateSequenceScript("booking", v)}
                                        followups={config.sequences.booking.followups}
                                        onFollowupsChange={(f) => updateSequenceFollowups("booking", f)}
                                        disabled={isFetchingPrompt}
                                    />

                                    {/* Call Booked Sequence Section (includes VSL link) */}
                                    <SequenceSection
                                        title="Call Booked"
                                        description="After prospect books a call"
                                        isOpen={openSections.includes("callBooked")}
                                        onToggle={() => toggleSection("callBooked")}
                                        script={config.sequences.callBooked.script}
                                        onScriptChange={(v) => updateSequenceScript("callBooked", v)}
                                        followups={config.sequences.callBooked.followups}
                                        onFollowupsChange={(f) => updateSequenceFollowups("callBooked", f)}
                                        showVslLink
                                        vslLink={config.sequences.vslLink}
                                        onVslLinkChange={(v) => setConfig((prev) => ({ ...prev, sequences: { ...prev.sequences, vslLink: v } }))}
                                        disabled={isFetchingPrompt}
                                    />
                                </div>

                                {promptError && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{promptError}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================================================================
            RIGHT PANEL - TEST CHAT (Standard Chatbot Style)
            Preview how the AI responds to messages
        ================================================================ */}
                <div
                    className={cn(
                        "w-full lg:w-[400px] xl:w-[440px] h-full flex flex-col border-l border-border bg-card",
                        // On mobile, this is hidden by default, shown when showPreview is true
                        !showPreview && "hidden lg:flex"
                    )}
                >
                    {/* Header */}
                    <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center justify-between">
                        {/* Mobile: Back button */}
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0" onClick={() => setShowPreview(false)}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            {/* Avatar & Title */}
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">AI Preview</p>
                                    <p className="text-xs text-muted-foreground">Test your scripts</p>
                                </div>
                            </div>
                        </div>
                        {/* Stage Selector */}
                        <Select value={stageContext} onValueChange={(v) => setStageContext(v as StageContext)}>
                            <SelectTrigger className="w-auto h-8 text-xs bg-muted border-0 px-3 gap-1.5 rounded-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                                {STAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value} className="text-xs">
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Chat Messages Area */}
                    <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
                        <div className="p-4 space-y-3">
                            {testMessages.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="h-7 w-7 text-primary" />
                                    </div>
                                    <p className="font-medium text-foreground">Test your AI</p>
                                    <p className="text-sm text-muted-foreground mt-1">Send a message to see how it responds</p>
                                </div>
                            )}
                            {testMessages.map((message) => (
                                <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={cn(
                                            "relative max-w-[80%] rounded-2xl px-4 py-2.5",
                                            message.isUser
                                                ? "bg-primary text-primary-foreground rounded-br-md"
                                                : message.isSystem
                                                ? "bg-muted text-muted-foreground border border-dashed border-border rounded-bl-md"
                                                : "bg-muted rounded-bl-md"
                                        )}
                                    >
                                        {!message.isSystem && message.stageTag && (
                                            <div className="absolute -top-3 right-3">
                                                <StageBadge stage={message.stageTag} className="rounded-full px-2 py-0.5 text-[10px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
                                            </div>
                                        )}
                                        <p className={cn("text-sm leading-relaxed", message.isSystem && "italic")}>{message.content}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={endOfMessagesRef} />
                            {/* Thinking indicator */}
                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Message Input Area */}
                    <div className="shrink-0 p-4 border-t border-border bg-background">
                        <div className="flex items-center gap-3">
                            <Input
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 h-10 rounded-full bg-muted border-0 px-4 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTestSend();
                                    }
                                }}
                            />
                            <Button size="icon" className="h-10 w-10 rounded-full shrink-0" onClick={handleTestSend} disabled={isThinking || !testInput.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
