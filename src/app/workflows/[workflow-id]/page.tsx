"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useGenerationState } from '@/hooks/use-generation-state';
import { GenerationCanvas } from '@/components/generation-canvas';
import { 
  Loader2, 
  AlertTriangle, 
  ArrowLeftIcon,
  PlayIcon,
  PanelLeftClose, 
  PanelLeftOpen,
  CheckCircle2,
  Clock,
  CircleCheckBig,
  SendIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function ViewWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowId = params?.['workflow-id'] as string | undefined;
  const generationId = searchParams?.get('generation-id') as string | undefined;

  const [currentWorkflowName, setCurrentWorkflowName] = useState<string>("Workflow Generation");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  
  // Mock nodes state
  const [mockNodesFetched, setMockNodesFetched] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Resizing logic state
  const [chatPanelWidth, setChatPanelWidth] = useState(400);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const isResizing = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // SSE-based generation state
  const {
    state: generationState,
    isConnected,
    isConnecting,
    connectionError,
    isProcessing,
    canShowCanvas,
    toggleChat,
    setMockNodes,
    hasMockNodes,
    isCompleted,
  } = useGenerationState({
    generationId: generationId || '',
    enabled: !!generationId,
  });

  const isGenerating = !!generationId && isProcessing;
  const generationError = connectionError || generationState.errorMessage;

  // Function to fetch mock nodes for immediate user feedback
  const fetchMockNodes = useCallback(async () => {
    if (mockNodesFetched || !generationId) return;
    
    try {
      setMockNodesFetched(true);
      console.log('🎯 Fetching initial details for generation:', generationId);
      
      // Call the simplified endpoint that returns { name, description, nodes }
      const response = await api.getInitialDetails(generationId);
      
      if (response.nodes && response.nodes.length > 0) {
        console.log('🚀 Received initial mock nodes:', response.nodes);
        // These are the initial mock nodes that should have the purple shimmer
        setMockNodes(response.nodes);
        
        // Set the workflow name from the API response
        if (response.name) {
          console.log('🏷️ Setting workflow name from API:', response.name);
          setCurrentWorkflowName(response.name);
        }
      } else {
        console.warn('⚠️ No nodes received in response:', response);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch mock nodes (non-critical):', error);
      // Fail silently - mock nodes are nice-to-have, not essential
    }
  }, [generationId, mockNodesFetched, setMockNodes]);

  // Fetch mock nodes when component mounts
  useEffect(() => {
    if (generationId && workflowId) {
      fetchMockNodes();
    }
  }, [generationId, workflowId, fetchMockNodes]);

  // Initialize loading state
  useEffect(() => {
    if (workflowId && generationId) {
      setLoading(false);
      setError(null);
    } else if (!workflowId || !generationId) {
      setError("Workflow ID or Generation ID is missing.");
      setLoading(false);
    }
  }, [workflowId, generationId]);

  // Update chat with SSE messages
  useEffect(() => {
    if (generationState.chatMessages && generationState.chatMessages.length > 0) {
      const newMessages = generationState.chatMessages
        .filter(msg => msg && msg.content) // Filter out null/undefined messages
        .map(msg => ({
          role: msg.type === 'system' ? "user" as const : "assistant" as const,
          content: msg.content || ''
        }));
      setChatHistory(newMessages);
    }
  }, [generationState.chatMessages]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  // Chat handlers
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentMessage(e.target.value);
  };

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      setChatHistory(prev => [...prev, { role: 'user', content: currentMessage.trim() }]);
      setCurrentMessage("");
      
      // Simulate response
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: "I'll help you update the workflow based on your request!" 
        }]);
      }, 1500);
    }
  };

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Title editing handlers
  const handleEditTitle = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentWorkflowName(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  // Panel resize handlers
  const handleMouseDownResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = chatPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = startWidth + (e.clientX - startX);
      setChatPanelWidth(Math.max(280, Math.min(newWidth, window.innerWidth * 0.6)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleChatPanel = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  const handleSaveWorkflow = () => {
    console.log("Publishing workflow...");
    // Placeholder for save functionality
  };

  const handleRunWorkflow = () => {
    console.log("Running workflow...");
    // Placeholder for run functionality
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading workflow data...</p>
      </div>
    );
  }

  if (error && !generationId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Workflow</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button onClick={() => router.push('/generate-workflow')}>
          Back to Generator
        </Button>
      </div>
    );
  }

  const formattedCreationDate = new Date().toLocaleDateString();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background">
      {/* Enhanced Page Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={currentWorkflowName}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="text-xl font-medium py-1 h-auto"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-xl font-medium truncate cursor-text hover:text-primary transition-colors flex items-center"
                  onClick={handleEditTitle}
                  title="Click to edit workflow name"
                >
                  {currentWorkflowName}
                </h1>
              )}
            </div>

            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <span>Created on {formattedCreationDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleSaveWorkflow}
            className="flex items-center"
          >
            <CircleCheckBig className="h-4 w-4 mr-1.5" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content Area (Chat + Canvas) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Panel */}
        <div 
          className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r transition-all duration-300 ${
            isChatMinimized ? "w-[50px]" : ""
          }`}
          style={!isChatMinimized ? { 
            width: chatPanelWidth, 
            minWidth: 280, 
            maxWidth: "60vw", 
            transition: isResizing.current ? "none" : "width 0.3s ease-out" 
          } : {}}
        >
          {isChatMinimized ? (
            <div className="flex flex-col items-center py-4 h-full">
              <button 
                onClick={toggleChatPanel} 
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Expand chat panel"
              >
                <PanelLeftOpen className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <>
              {/* Chat Panel Header */}
              <div className="border-b p-3 flex items-center justify-between">
                <div className="font-medium text-sm">
                  Chat
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7"
                    onClick={handleRunWorkflow}
                  >
                    <PlayIcon className="h-3.5 w-3.5 mr-1" />
                    Run Workflow
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={toggleChatPanel}
                    title="Minimize chat panel"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-3 rounded-lg bg-muted flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <p className="text-sm">Generating workflow...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t p-3">
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={currentMessage}
                    onChange={handleMessageChange}
                    onKeyDown={handleMessageKeyDown}
                    placeholder="Edit your workflow..."
                    className="min-h-20 text-sm resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim()}
                    >
                      <SendIcon className="h-4 w-4 mr-1.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Resize Handle */}
        {!isChatMinimized && (
          <div 
            className="w-1.5 cursor-col-resize bg-gray-200 hover:bg-primary/50 transition-colors duration-150"
            onMouseDown={handleMouseDownResize}
          />
        )}

        {/* Right: Generation Canvas */}
        <div className="flex-1 h-full overflow-hidden bg-gray-50">
          <GenerationCanvas 
            generationState={generationState}
            isConnected={isConnected}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}