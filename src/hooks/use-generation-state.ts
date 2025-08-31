"use client"

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSSE } from './use-sse';
import {
  GenerationState,
  SSEEvent,
  SSEStepEvent,
  InternalWorkflowNode,
  InternalConnection,
  ChatMessage,
  InternalDatabaseInfo,
} from '@/types/generation';
import {
  parseSSEMessage,
  isSSEStepEvent,
  isSSESystemEvent,
  transformNodes,
  transformConnections,
  transformDatabaseInfo,
  updateNodeConfiguration,
  updateNodeStatus,
  createChatMessage,
  sanitizeEventData,
  extractConnectionsFromNodes,
  transformArchitecturePlannerNodes,
  transformMockNodes,
} from '@/lib/generation-transformers';

interface UseGenerationStateOptions {
  generationId: string;
  enabled?: boolean;
  baseUrl?: string;
}

interface UseGenerationStateReturn {
  // State
  state: GenerationState;
  
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  isCompleted: boolean;
  connectionError: string | null;
  
  // Actions
  reset: () => void;
  toggleChat: () => void;
  setMockNodes: (nodeNames: string[]) => void;
  
  // Derived state
  isProcessing: boolean;
  canShowCanvas: boolean;
  hasNodes: boolean;
  hasConnections: boolean;
  hasMockNodes: boolean;
}

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

// Initial state
const createInitialState = (generationId?: string): GenerationState => ({
  currentStep: null,
  isComplete: false,
  hasError: false,
  chatMessages: [],
  nodes: [],
  connections: [],
  mockNodes: [],
  hasMockNodes: false,
  showCanvas: false,
  isCollapsed: false,
  generationId,
});

export function useGenerationState({
  generationId,
  enabled = true,
  baseUrl,
}: UseGenerationStateOptions): UseGenerationStateReturn {
  
  const [state, setState] = useState<GenerationState>(() => 
    createInitialState(generationId)
  );
  const [sseCompleted, setSseCompleted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Debug counters and processed event tracking
  const eventCountRef = useRef({ received: 0, processed: 0 });
  const processedEventIds = useRef<Set<string>>(new Set());

  // Build SSE URL
  const sseUrl = useMemo(() => {
    if (!enabled || !generationId) return null;
    const base = baseUrl || getBaseUrl();
    return `${base}/generations/${generationId}/stream`;
  }, [generationId, baseUrl, enabled]);

  // Handle SSE messages
  const handleSSEMessage = useCallback((event: SSEEvent) => {
    const eventId = `${event.step || event.type}_${Date.now()}`;
    
    if (processedEventIds.current.has(eventId)) {
      return;
    }
    
    processedEventIds.current.add(eventId);
    eventCountRef.current.received++;
    
    // Sanitize event data
    const sanitizedEvent = sanitizeEventData(event);
    
    setState(prevState => {
      const newState = { ...prevState };
      
      // Handle system events
      if (isSSESystemEvent(sanitizedEvent)) {
        if (sanitizedEvent.type === 'connected') {
          newState.currentStep = 'connected';
          // Don't add a chat message for connection
        } else if (sanitizedEvent.type === 'status') {
          if (sanitizedEvent.status === 'COMPLETED') {
            newState.isComplete = true;
            newState.currentStep = 'completed';
            newState.chatMessages = [
              ...newState.chatMessages,
              {
                id: `msg_${Date.now()}_completed`,
                type: 'assistant',
                content: 'Agent generation complete!',
                timestamp: new Date(),
                step: 'completed'
              }
            ];
          } else if (sanitizedEvent.status === 'ERROR') {
            newState.hasError = true;
            newState.currentStep = 'error';
            newState.chatMessages = [
              ...newState.chatMessages,
              {
                id: `msg_${Date.now()}_error`,
                type: 'error',
                content: 'An error occurred during generation',
                timestamp: new Date(),
                step: 'error'
              }
            ];
          }
        }
        return newState;
      }
      
      // Handle step events
      if (isSSEStepEvent(sanitizedEvent)) {
        const { step, status, data } = sanitizedEvent;
        
        newState.currentStep = step;
        
        // Handle architecture_planner started - add the summary as a user message
        if (step === 'architecture_planner' && status === 'started' && data?.summary) {
          newState.chatMessages = [
            ...newState.chatMessages,
            {
              id: `msg_${Date.now()}_prompt`,
              type: 'system',
              content: data.summary,
              timestamp: new Date(),
              step: 'architecture_planner'
            }
          ];
        }
        
        // Handle specific steps
        if (step === 'architecture_planner' && status === 'done' && data?.summary) {
          const mockNodeNames = Array.isArray(data.summary) ? data.summary : [];
          const mockNodes = transformArchitecturePlannerNodes({ summary: mockNodeNames });
          newState.mockNodes = mockNodes;
          newState.hasMockNodes = mockNodes.length > 0;
          newState.showCanvas = true;
        }
        
        if (step === 'node_selector' && status === 'done' && data?.nodes) {
          const transformedNodes = transformNodes(data);
          newState.nodes = transformedNodes;
          newState.hasMockNodes = false;
          newState.mockNodes = [];
        }
        
        if (step === 'connection_builder' && status === 'done') {
          // Transform and set connections
          console.log('Processing connection_builder data:', data);
          const transformedConnections = transformConnections(data);
          console.log('Transformed connections:', transformedConnections);
          newState.connections = transformedConnections;
        }
        
        if (step === 'node_configurator') {
          if (status === 'started' && data?.nodeId) {
            // Set node status to configuring for pulsing animation
            newState.nodes = updateNodeStatus(newState.nodes, data.nodeId, 'configuring');
          } else if (status === 'done') {
            // Update specific node configuration
            const previousNodeCount = newState.nodes.length;
            const updatedNodes = updateNodeConfiguration(newState.nodes, data);
            
            // Check if we extracted nodes from malformed data (backend bug)
            if (updatedNodes.length > previousNodeCount) {
              console.log('Detected malformed node data extraction, also extracting connections...');
              newState.nodes = updatedNodes;
              // Extract connections from the node parameters since connection_builder returned empty
              newState.connections = extractConnectionsFromNodes(updatedNodes);
              newState.showCanvas = true; // Show canvas now that we have nodes
            } else {
              newState.nodes = updatedNodes;
            }
          }
        }
        
        if (step === 'database_setup' && status === 'done' && data?.databases) {
          const databases = transformDatabaseInfo(data.databases);
          newState.databases = databases;
        }
        
        if (status === 'error') {
          newState.hasError = true;
          newState.chatMessages = [
            ...newState.chatMessages,
            {
              id: `msg_${Date.now()}_step_error`,
              type: 'error',
              content: data?.message || `Error in ${step}`,
              timestamp: new Date(),
              step: step
            }
          ];
        }
      }
      
      eventCountRef.current.processed++;
      return newState;
    });
  }, []);

  // Setup SSE connection
  const { isConnected, error } = useSSE(sseUrl, {
    onOpen: () => {
      setIsConnecting(false);
    },
    onMessage: handleSSEMessage,
    onError: (err) => {
      setState(prev => ({
        ...prev,
        hasError: true,
        chatMessages: [
          ...prev.chatMessages,
          createChatMessage('error', `Connection error: ${err.message}`, 'error')
        ]
      }));
      setSseCompleted(true);
      setIsConnecting(false);
    },
    onClose: () => {
      setSseCompleted(true);
      setIsConnecting(false);
    }
  });

  // Actions
  const reset = useCallback(() => {
    setState(createInitialState(generationId));
    setSseCompleted(false);
    processedEventIds.current.clear();
    eventCountRef.current = { received: 0, processed: 0 };
  }, [generationId]);

  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  const setMockNodes = useCallback((nodeNames: string[]) => {
    setState(prev => {
      const mockNodes = transformMockNodes(nodeNames);
      return {
        ...prev,
        mockNodes,
        hasMockNodes: mockNodes.length > 0,
        showCanvas: mockNodes.length > 0,
      };
    });
  }, []);

  // Derived state
  const isProcessing = state.currentStep !== null && !state.isComplete && !state.hasError;
  const canShowCanvas = state.showCanvas || state.nodes.length > 0 || state.hasMockNodes;
  const hasNodes = state.nodes.length > 0;
  const hasConnections = state.connections.length > 0;
  const hasMockNodes = state.hasMockNodes;

  return {
    state,
    isConnected,
    isConnecting,
    isCompleted: state.isComplete || sseCompleted,
    connectionError: error?.message || null,
    reset,
    toggleChat,
    setMockNodes,
    isProcessing,
    canShowCanvas,
    hasNodes,
    hasConnections,
    hasMockNodes,
  };
}