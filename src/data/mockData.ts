import { Prospect, Message, Conversation, DashboardStats, FunnelData } from "@/types";

export const mockProspects: Prospect[] = [
  {
    id: "1",
    name: "John Smith",
    handle: "@johnsmith_fit",
    avatar: "",
    stage: "lead",
    followers: 12500,
    following: 890,
    leadScore: 78,
    autopilotEnabled: true,
    lastMessage: "Yeah for sure man, how about we hop on a quick call?",
    lastMessageTime: "1d",
    isUnread: false,
  },
  {
    id: "2",
    name: "Sarah Connor",
    handle: "@sarahconnor",
    avatar: "",
    stage: "qualified",
    followers: 8200,
    following: 456,
    leadScore: 85,
    autopilotEnabled: true,
    lastMessage: "I've been looking for a coach for a while now",
    lastMessageTime: "2h",
    isUnread: true,
  },
  {
    id: "3",
    name: "Mike Johnson",
    handle: "@mikej_training",
    avatar: "",
    stage: "responded",
    followers: 3400,
    following: 234,
    leadScore: 45,
    autopilotEnabled: false,
    lastMessage: "Thanks for reaching out!",
    lastMessageTime: "3d",
    isUnread: false,
  },
  {
    id: "4",
    name: "Emily Davis",
    handle: "@emilyd_wellness",
    avatar: "",
    stage: "call-booked",
    followers: 15600,
    following: 1200,
    leadScore: 92,
    autopilotEnabled: true,
    lastMessage: "Looking forward to our call tomorrow!",
    lastMessageTime: "5h",
    isUnread: false,
  },
  {
    id: "5",
    name: "Alex Thompson",
    handle: "@alexthompson",
    avatar: "",
    stage: "sale",
    followers: 22000,
    following: 567,
    leadScore: 98,
    autopilotEnabled: false,
    lastMessage: "Just sent the payment!",
    lastMessageTime: "1w",
    isUnread: false,
  },
  {
    id: "6",
    name: "Jessica Lee",
    handle: "@jessicalee_fit",
    avatar: "",
    stage: "lead",
    followers: 5800,
    following: 320,
    leadScore: 67,
    autopilotEnabled: true,
    lastMessage: "What's included in your coaching program?",
    lastMessageTime: "4h",
    isUnread: true,
  },
];

export const mockMessages: Message[] = [
  {
    id: "1",
    content: "Hey! I noticed you're into fitness coaching. I've been following your content and it's really inspiring!",
    timestamp: "10:30 AM",
    isFromProspect: true,
  },
  {
    id: "2",
    content: "Thanks so much! I appreciate that. What are your current fitness goals?",
    timestamp: "10:45 AM",
    isFromProspect: false,
  },
  {
    id: "3",
    content: "I'm looking to build muscle and get stronger. Been working out for about a year but feel stuck.",
    timestamp: "11:00 AM",
    isFromProspect: true,
  },
  {
    id: "4",
    content:
      "That's a common plateau! With the right programming and nutrition guidance, we can definitely break through that. Would you be interested in hopping on a quick call to discuss your goals?",
    timestamp: "11:15 AM",
    isFromProspect: false,
  },
  {
    id: "5",
    content: "Yeah for sure man, how about we hop on a quick call?",
    timestamp: "11:30 AM",
    isFromProspect: true,
  },
];

export const mockConversation: Conversation = {
  prospect: mockProspects[0],
  messages: mockMessages,
  aiNotes: [
    "Interested in muscle building and strength",
    "Has been training for 1 year - experiencing plateau",
    "Engaged and responsive - high conversion potential",
    "Best time to call: weekday evenings",
  ],
  queuedMessage: {
    content: "What country are you based in and what's your age?",
    sendsIn: 76, // seconds
  },
};

export const mockDashboardStats: DashboardStats = {
  ongoingChats: 4,
  autopilotEnabled: 5,
  needsReview: 5,
  inFollowupSequence: 12,
};

export const mockFunnelData: FunnelData = {
  responded: 100,
  lead: 20,
  qualified: 8,
  callBooked: 5,
  sale: 1,
};
