import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { ProspectPanel } from "@/components/messages/ProspectPanel";
import { mockProspects, mockConversation } from "@/data/mockData";
import { FunnelStage, Prospect } from "@/types";
import { useSearchParams } from "react-router-dom";

const stageFilters: (FunnelStage | 'all')[] = [
  'all', 'responded', 'lead', 'qualified', 'call-booked', 'sale', 'ignored', 'unread'
];

export default function Messages() {
  const [searchParams] = useSearchParams();
  const initialStage = (searchParams.get('stage') as FunnelStage | 'all') || 'all';
  
  const [selectedFilter, setSelectedFilter] = useState<FunnelStage | 'all'>(initialStage);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(mockProspects[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProspects = mockProspects.filter((prospect) => {
    const matchesFilter = selectedFilter === 'all' || prospect.stage === selectedFilter;
    const matchesSearch = prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prospect.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Conversation List */}
        <ConversationList
          prospects={filteredProspects}
          selectedProspect={selectedProspect}
          onSelectProspect={setSelectedProspect}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stageFilters={stageFilters}
        />

        {/* Chat Window */}
        <ChatWindow
          conversation={selectedProspect ? { ...mockConversation, prospect: selectedProspect } : null}
        />

        {/* Prospect Panel */}
        <ProspectPanel
          prospect={selectedProspect}
          aiNotes={mockConversation.aiNotes}
          queuedMessage={mockConversation.queuedMessage}
        />
      </div>
    </AppLayout>
  );
}
