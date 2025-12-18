// TODO Vaibhav: Replace mock data with API calls
// - GET /api/outreach/messages (pending, approved, rejected)
// - POST /api/outreach/approve/:id
// - POST /api/outreach/reject/:id
// - POST /api/outreach/autofire { limit: number }

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { TabToggle } from "@/components/TabToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Check, X, ChevronLeft, ChevronRight, Zap, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OutreachStatus = "pending" | "approved" | "rejected";

interface OutreachMessage {
  id: string;
  name: string;
  handle: string;
  score: number;
  bio: string;
  message: string;
  status: OutreachStatus;
}

// TODO Vaibhav: Replace with API call
const generateMockMessages = (): OutreachMessage[] => {
  const names = ["Ayden Lum", "Sarah Chen", "Mike Ross", "Emma Wilson", "James Park", "Lisa Wang", "Jordan Blake", "Taylor Kim", "Alex Rivera", "Morgan Lee", "Chris Johnson", "Jamie Smith", "Casey Brown", "Riley Davis", "Quinn Martinez"];
  const handles = ["@creaydren", "@sarahfit", "@mikeross", "@emmaw", "@jamespark", "@lisawang", "@jordanb", "@taylork", "@alexr", "@morganlee", "@chrisj", "@jamies", "@caseyb", "@rileyd", "@quinnm"];
  const ages = [19, 21, 24, 27, 30, 33, 35, 28, 22, 26, 31, 38, 42, 25, 29, 34, 23, 20];
  const locations = ["US", "Canada", "UK", "Australia", "Germany", "Spain", "Brazil", "Japan", "Singapore", "Dubai", "NYC", "LA", "Miami", "London", "Toronto", "Berlin", "Paris", "Sydney"];
  const professions = ["Entrepreneur", "Fitness Coach", "Baker", "Software Dev", "Content Creator", "Personal Trainer", "Student", "Marketing Manager", "Photographer", "Real Estate Agent", "Designer", "Nutritionist", "YouTuber", "E-commerce Owner", "Freelancer", "Consultant", "Gym Owner", "Model", "Influencer", "Life Coach"];
  
  return Array.from({ length: 1200 }, (_, i) => {
    let status: OutreachStatus;
    if (i < 1000) status = "pending";
    else if (i < 1100) status = "approved";
    else status = "rejected";
    
    return {
      id: String(i + 1),
      name: names[i % names.length],
      handle: handles[i % handles.length],
      score: Math.floor(Math.random() * 40) + 50,
      bio: `${ages[i % ages.length]}, ${locations[i % locations.length]}, ${professions[i % professions.length]}`,
      message: "Hey, just wanted to say I appreciate the follow & support. Are you currently on a fitness journey of your own or just scrollin thru content?\n\nI see you're into gym and fitness.\n\nWhat are your current goals?",
      status,
    };
  });
};

const mockMessages: OutreachMessage[] = generateMockMessages();

type FilterType = "all" | OutreachStatus;
type AccountType = "new" | "established" | "aged" | "verified";

interface AccountConfig {
  label: string;
  safe: { min: number; max: number };
  official: { min: number; max: number };
  aggressive: { min: number; max: number };
}

// DM limits based on Instagram account age to avoid restrictions
const ACCOUNT_LIMITS: Record<AccountType, AccountConfig> = {
  new: { 
    label: "New Account (0-30 days)", 
    safe: { min: 15, max: 25 },
    official: { min: 20, max: 30 },
    aggressive: { min: 40, max: 50 }
  },
  established: { 
    label: "Established (30-180 days)", 
    safe: { min: 40, max: 60 },
    official: { min: 50, max: 70 },
    aggressive: { min: 80, max: 100 }
  },
  aged: { 
    label: "Aged (180+ days)", 
    safe: { min: 80, max: 120 },
    official: { min: 100, max: 150 },
    aggressive: { min: 150, max: 200 }
  },
  verified: { 
    label: "Verified/Business", 
    safe: { min: 150, max: 250 },
    official: { min: 200, max: 300 },
    aggressive: { min: 300, max: 500 }
  },
};

type RiskLevel = "safe" | "official" | "aggressive";
const ITEMS_PER_PAGE = 25;

export default function ColdOutreach() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const [currentPage, setCurrentPage] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(40);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [autofireTimestamp, setAutofireTimestamp] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const autofireUsedToday = autofireTimestamp !== null && Date.now() - autofireTimestamp < 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (!autofireTimestamp) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const elapsed = Date.now() - autofireTimestamp;
      const remaining = 24 * 60 * 60 * 1000 - elapsed;
      
      if (remaining <= 0) {
        setAutofireTimestamp(null);
        setTimeRemaining(null);
        return;
      }

      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [autofireTimestamp]);

  const filterCounts = {
    all: messages.length,
    pending: messages.filter((m) => m.status === "pending").length,
    approved: messages.filter((m) => m.status === "approved").length,
    rejected: messages.filter((m) => m.status === "rejected").length,
  };

  const sortedMessages = [...messages].sort((a, b) => b.score - a.score);

  const filteredMessages = sortedMessages.filter((msg) => {
    if (activeFilter !== "all" && msg.status !== activeFilter) return false;
    if (searchQuery && !msg.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleApprove = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, status: "approved" as OutreachStatus } : msg))
    );
  };

  const handleReject = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, status: "rejected" as OutreachStatus } : msg))
    );
  };

  const executeAutofire = () => {
    if (!accountType) return;
    
    const pendingMessages = sortedMessages.filter((m) => m.status === "pending");
    const toApprove = pendingMessages.slice(0, dailyLimit);

    if (toApprove.length === 0) {
      toast.info("No pending messages to send");
      return;
    }

    const approveIds = new Set(toApprove.map((m) => m.id));
    setMessages((prev) =>
      prev.map((msg) =>
        approveIds.has(msg.id) ? { ...msg, status: "approved" as OutreachStatus } : msg
      )
    );

    setAutofireTimestamp(Date.now());
    toast.success(`Autofired ${toApprove.length} messages`);
  };

  const handleAccountSelect = (type: AccountType) => {
    setAccountType(type);
    setDailyLimit(ACCOUNT_LIMITS[type].safe.min);
    setAccountDialogOpen(false);
  };

  const getPendingCount = () => sortedMessages.filter((m) => m.status === "pending").length;
  const getAutofireCount = () => accountType ? Math.min(dailyLimit, getPendingCount()) : 0;

  const getRiskLevel = (): RiskLevel | null => {
    if (!accountType) return null;
    const config = ACCOUNT_LIMITS[accountType];
    if (dailyLimit <= config.safe.max) return "safe";
    if (dailyLimit <= config.official.max) return "official";
    return "aggressive";
  };

  const getRiskLevelDisplay = (risk: RiskLevel | null) => {
    switch (risk) {
      case "safe": return { label: "LOWER RISK", className: "bg-green-500/10 text-green-600" };
      case "official": return { label: "MEDIUM RISK", className: "bg-orange-500/10 text-orange-600" };
      case "aggressive": return { label: "HIGH RISK", className: "bg-destructive/10 text-destructive" };
      default: return null;
    }
  };

  const getMaxLimit = () => accountType ? ACCOUNT_LIMITS[accountType].aggressive.max : 100;
  const getMinLimit = () => accountType ? ACCOUNT_LIMITS[accountType].safe.min : 10;

  const getStatusColor = (status: OutreachStatus) => {
    switch (status) {
      case "pending": return "bg-orange-500";
      case "approved": return "bg-green-500";
      case "rejected": return "bg-destructive";
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* ================================================================
            HEADER SECTION
            Shows page title and tab toggle (Outbound/Stats)
        ================================================================ */}
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">Cold Outreach</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Review and approve AI-generated personalised cold outreach messages.
            </p>
          </div>
          <TabToggle
            tabs={[
              { label: "Outbound", href: "/cold-outreach" },
              { label: "Stats", href: "/cold-outreach/stats" },
            ]}
            className="self-start sm:self-auto"
          />
        </div>

        {/* ================================================================
            FILTERS AND CONTROLS SECTION
        ================================================================ */}
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
          
          {/* Filter Pills - Pending/All/Approved/Rejected */}
          <div className="flex flex-wrap items-center gap-2">
            {(["pending", "all", "approved", "rejected"] as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)} ({filterCounts[filter]})
              </button>
            ))}
          </div>
          
          {/* Account Selector and Controls */}
          <div className="flex flex-col gap-3">
            
            {/* Account Type Selector - Primary action */}
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full h-12 justify-between text-sm font-medium",
                    !accountType && "border-orange-500 border-2 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {!accountType && <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />}
                    <span className="truncate">{accountType ? ACCOUNT_LIMITS[accountType].label : "Select account type"}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50 shrink-0" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>What type of Instagram account do you have?</DialogTitle>
                  <DialogDescription>
                    Select your account age to set safe daily DM limits. This protects your account from restrictions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  {(Object.entries(ACCOUNT_LIMITS) as [AccountType, AccountConfig][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleAccountSelect(key)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-lg border transition-colors text-left",
                        accountType === key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Safe: {config.safe.min}-{config.safe.max} DMs/day
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {accountType === key && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* 
              DM LIMIT SLIDER
              Only shows after account type is selected.
              Allows coach to set their daily DM limit within safe/aggressive range.
            */}
            {accountType && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Daily DM limit</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{dailyLimit} DMs</span>
                    {getRiskLevelDisplay(getRiskLevel()) && (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        getRiskLevelDisplay(getRiskLevel())?.className
                      )}>
                        {getRiskLevelDisplay(getRiskLevel())?.label}
                      </span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[dailyLimit]}
                  onValueChange={(value) => setDailyLimit(value[0])}
                  min={getMinLimit()}
                  max={getMaxLimit()}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Safe ({getMinLimit()})</span>
                  <span>Aggressive ({getMaxLimit()})</span>
                </div>
              </div>
            )}

            {/* 
              AUTOFIRE BUTTON
              The main action button. Requires:
              1. Account type to be selected
              2. Not already used today
              
              Shows confirmation dialog before executing.
              If no account type, clicking opens the account selection dialog.
            */}
            {!accountType ? (
              <Button
                onClick={() => setAccountDialogOpen(true)}
                className="w-full gap-2 h-10 bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
              >
                <Zap className="h-4 w-4" />
                Select account type first
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={autofireUsedToday}
                    className={cn(
                      "w-full gap-2 h-10",
                      autofireUsedToday
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
                    )}
                  >
                    <Zap className="h-4 w-4" />
                    {autofireUsedToday 
                      ? `Available in ${timeRemaining}` 
                      : `Autofire ${getAutofireCount()} DMs`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Confirm Autofire
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        You are about to send <strong>{getAutofireCount()} DMs</strong> automatically.
                      </p>
                      <p className="text-xs">
                        Account type: <strong>{ACCOUNT_LIMITS[accountType].label}</strong>
                        <br />
                        Daily limit: <strong>{dailyLimit} DMs/day</strong>
                        <br />
                        {getRiskLevelDisplay(getRiskLevel()) && (
                          <>
                            Risk level: <span className={cn(
                              "font-medium",
                              getRiskLevel() === "safe" && "text-green-500",
                              getRiskLevel() === "official" && "text-orange-500",
                              getRiskLevel() === "aggressive" && "text-destructive"
                            )}>{getRiskLevelDisplay(getRiskLevel())?.label}</span>
                          </>
                        )}
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={executeAutofire}
                      className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Send {getAutofireCount()} DMs
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Search Input - Secondary priority */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search prospects..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </div>


        {/* ================================================================
            MESSAGE GRID
            Displays all messages in a responsive grid layout
        ================================================================ */}
        <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
          {paginatedMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "relative rounded-xl border p-4 shadow-card transition-shadow hover:shadow-card-lg",
                // Status-based background colors
                msg.status === "approved" && "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
                msg.status === "rejected" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
                msg.status === "pending" && "border-border bg-card"
              )}
            >
              {/* Status Indicator Dot (top-right corner) */}
              <div
                className={cn(
                  "absolute -right-1 -top-1 h-5 w-5 rounded-full border-2 border-card",
                  getStatusColor(msg.status)
                )}
              />

              {/* User Info Section */}
              <div className="mb-3 flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {msg.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span className="font-medium text-foreground truncate">{msg.name}</span>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      Score: <span className="text-primary">{msg.score}</span>
                    </span>
                  </div>
                  <span className="text-sm text-primary">{msg.handle}</span>
                </div>
              </div>

              {/* Bio Summary */}
              <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{msg.bio}</p>

              {/* AI-Generated Message Preview */}
              <div className="mb-3 rounded-lg bg-primary/10 p-3">
                <p className="whitespace-pre-line text-sm text-foreground line-clamp-4">{msg.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">Click to edit</p>
              </div>

              {/* Action Buttons or Status Label */}
              {msg.status === "approved" ? (
                <p className="text-sm font-medium text-green-600">Approved</p>
              ) : msg.status === "rejected" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-destructive">Rejected</p>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-500 text-white hover:bg-green-600"
                    onClick={() => handleApprove(msg.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                </div>
              ) : (
                // Pending status - show approve/reject buttons
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-500 text-white hover:bg-green-600"
                    onClick={() => handleApprove(msg.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleReject(msg.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ================================================================
            PAGINATION
            Shows page numbers and prev/next buttons
        ================================================================ */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-4 pb-20 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-4">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length}
            </p>
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {/* Previous Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              {/* Page Numbers (shows 3 pages max) */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage <= 2) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              {/* Next Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

