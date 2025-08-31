import {
  SSEEvent,
  SSEStepEvent,
  SSESystemEvent,
  NodeSelectorData,
  DatabaseSetupData,
  NodeConfiguratorData,
  ConnectionBuilderData,
  InternalWorkflowNode,
  InternalConnection,
  InternalDatabaseInfo,
  ChatMessage,
  SSEStepType,
  ArchitecturePlannerData,
  GenerationState,
} from '@/types/generation';
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

/**
 * Type guard to check if an event is a step event
 */
export function isSSEStepEvent(event: SSEEvent): event is SSEStepEvent {
  return 'step' in event && 'status' in event;
}

/**
 * Type guard to check if an event is a system event
 */
export function isSSESystemEvent(event: SSEEvent): event is SSESystemEvent {
  return 'type' in event && !('step' in event);
}

/**
 * Parse raw SSE message data into typed event
 */
export function parseSSEMessage(rawData: string): SSEEvent | null {
  try {
    const parsed = JSON.parse(rawData);
    console.log('🔍 Parsed JSON:', parsed);
    
    // Check if it's a step event
    if (isSSEStepEvent(parsed)) {
      console.log('✅ Valid step event:', parsed.step, parsed.status);
      return parsed;
    }
    
    // Check if it's a system event
    if (isSSESystemEvent(parsed)) {
      console.log('✅ Valid system event:', parsed.type);
      return parsed;
    }
    
    console.warn('❌ Invalid SSE event format:', parsed);
    return null;
  } catch (error) {
    console.error('❌ Failed to parse SSE message:', error, rawData);
    return null;
  }
}

export function transformArchitecturePlannerNodes(data: ArchitecturePlannerData): InternalWorkflowNode[] {
  // Only handle array format (new format), ignore string format
  if (typeof data.summary === 'string') {
    return [];
  }
  
  return data.summary.map((nodeName, index) => {
    const nodeId = `node_${nodeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${index}`;
    return {
      nodeId,
      name: nodeName,
      description: `${nodeName} node - finalizing nodes...`,
      status: 'idle' as const,
      // Infer category and icon from name
      category: inferNodeCategory(nodeName, nodeName),
      icon: inferNodeIcon(nodeName, nodeName),
      // Generate mock inputs/outputs for now (will be replaced by real data later)
      inputs: generateMockInputs(nodeName),
      outputs: generateMockOutputs(nodeName),
      // Mark as architecture planner node
      isArchitecturePlanner: true,
    };
  });
}

/**
 * Transform mock node names to internal nodes for immediate user feedback
 */
export function transformMockNodes(nodeNames: string[]): InternalWorkflowNode[] {
  return nodeNames.map((nodeName, index) => {
    const nodeId = `mock_${nodeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${index}`;
    return {
      nodeId,
      name: nodeName,
      description: `${nodeName} - generating details...`,
      status: 'generating' as const,
      // Infer category and icon from name
      category: inferNodeCategory(nodeName, nodeName),
      icon: inferNodeIcon(nodeName, nodeName),
      // Generate mock inputs/outputs for now (will be replaced by real data later)
      inputs: generateMockInputs(nodeName),
      outputs: generateMockOutputs(nodeName),
      // Mark as mock node
      isMock: true,
    };
  });
}

/**
 * Transform NodeSelectorData to internal nodes
 * Handles the nodeId vs id inconsistency
 */
export function transformNodes(data: NodeSelectorData): InternalWorkflowNode[] {
  if (!data || !data.nodes || !Array.isArray(data.nodes)) {
    console.warn('Invalid or missing nodes data:', data);
    return [];
  }
  
  return data.nodes.map((node) => {
    if (!node || !node.nodeId) {
      console.warn('Node missing or missing nodeId field:', node);
      return null;
    }

    return {
      nodeId: node.nodeId,
      name: node.name || 'Unnamed Node',
      description: node.description || 'No description',
      status: 'idle' as const,
      // Infer category and icon from name/description
      category: inferNodeCategory(node.name, node.description),
      icon: inferNodeIcon(node.name, node.description),
      // Generate mock inputs/outputs for now (will be replaced by real data later)
      inputs: generateMockInputs(node.name),
      outputs: generateMockOutputs(node.name),
    };
  }).filter(Boolean) as InternalWorkflowNode[];
}

/**
 * Transform ConnectionBuilderData to internal connections
 */
export function transformConnections(data: ConnectionBuilderData): InternalConnection[] {
  return data.connections.map((conn, index) => ({
    source: conn.source,
    target: conn.target,
    id: `edge_${conn.source}_${conn.target}_${index}`,
  }));
}

/**
 * Transform DatabaseSetupData to internal database info
 */
export function transformDatabaseInfo(data: DatabaseSetupData): InternalDatabaseInfo | null {
  if (!data.databases || data.databases.length === 0) {
    console.warn('No databases in setup data:', data);
    return null;
  }

  // Take the first database for now
  // TODO: Update UI to handle multiple databases
  const firstDb = data.databases[0];
  return {
    name: firstDb.name,
    link: firstDb.link,
  };
}

/**
 * Update node configuration from NodeConfiguratorData
 * Also handles the backend bug where actual node data gets stuffed into malformed fields
 */
export function updateNodeConfiguration(
  nodes: InternalWorkflowNode[],
  data: NodeConfiguratorData
): InternalWorkflowNode[] {
  // Handle the backend bug: if nodeId is "unknown" and name/description contain stringified arrays,
  // this actually contains the real node data that should have come from node_selector
  if (data.nodeId === 'unknown' && typeof data.name === 'string' && data.name.startsWith('[')) {
    console.warn('Backend bug detected: node data in wrong format, extracting real nodes...');
    
    try {
      // Try to parse the stringified array from the name field
      const nodeStrings = JSON.parse(data.name);
      const extractedNodes: InternalWorkflowNode[] = [];
      
      for (const nodeStr of nodeStrings) {
        const parsed = parseNodeString(nodeStr);
        if (parsed) {
          extractedNodes.push(parsed);
        }
      }
      
      if (extractedNodes.length > 0) {
        console.log('Extracted nodes from malformed data:', extractedNodes);
        return extractedNodes; // Return the extracted nodes, replacing the empty array
      }
    } catch (error) {
      console.error('Failed to parse malformed node data:', error);
    }
  }

  // Normal node configuration update
  return nodes.map((node) => {
    if (node.nodeId === data.nodeId) {
      return {
        ...node,
        name: data.name || node.name,
        description: data.description || node.description,
        params: data.params || {},
        loop_text: data.loop_text,
        status: 'configured' as const,
        // Convert params to inputs for display
        inputs: {
          ...node.inputs,
          ...data.params,
        },
      };
    }
    return node;
  });
}

/**
 * Set node status (for configuring state)
 */
export function updateNodeStatus(
  nodes: InternalWorkflowNode[],
  nodeId: string,
  status: 'idle' | 'configuring' | 'configured'
): InternalWorkflowNode[] {
  return nodes.map((node) => {
    if (node.nodeId === nodeId) {
      return { ...node, status };
    }
    return node;
  });
}

/**
 * Create chat message from step event
 */
export function createChatMessage(
  event: SSEStepEvent,
  content?: string
): ChatMessage | null {
  // Only show messages for certain steps and statuses
  const showSteps: SSEStepType[] = ['database_setup'];
  
  if (!showSteps.includes(event.step)) {
    return null;
  }

  // Handle error events
  if (event.status === 'error') {
    const errorData = event.data as any;
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'error' as const,
      content: errorData.message || `Error in ${event.step}`,
      timestamp: new Date(),
      step: event.step,
    };
  }

  // Only show completed steps
  if (event.status !== 'done') {
    return null;
  }

  let messageContent = content;
  
  // Generate content based on step and data
  if (!messageContent) {
    switch (event.step) {
      case 'database_setup':
        const dbData = event.data as DatabaseSetupData;
        const dbCount = dbData.databases?.length || 0;
        if (dbCount === 0) return null;
        messageContent = `${dbCount} database${dbCount !== 1 ? 's' : ''} set up successfully`;
        break;
      default:
        messageContent = `${event.step} completed`;
    }
  }

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'step' as const,
    content: messageContent,
    timestamp: new Date(),
    step: event.step,
  };
}

/**
 * Infer node category from name and description
 */
function inferNodeCategory(name: string, description: string): 'Input' | 'Processing' | 'AI' | 'Output' {
  const text = (name + ' ' + description).toLowerCase();
  
  if (text.includes('input') || text.includes('form') || text.includes('enters')) {
    return 'Input';
  }
  if (text.includes('ai') || text.includes('gpt') || text.includes('model') || text.includes('reasoning')) {
    return 'AI';
  }
  if (text.includes('output') || text.includes('save') || text.includes('insert') || text.includes('store') || text.includes('send') || text.includes('email') || text.includes('slack')) {
    return 'Output';
  }
  return 'Processing';
}

/**
 * Infer node icon from name and description
 */
function inferNodeIcon(name: string, description: string): string {
  const text = (name + ' ' + description).toLowerCase();
  
  if (text.includes('user') || text.includes('input') || text.includes('form')) return 'user';
  if (text.includes('ai') || text.includes('reasoning') || text.includes('gpt')) return 'brain';
  if (text.includes('database') || text.includes('save') || text.includes('store')) return 'database';
  if (text.includes('email') || text.includes('mail')) return 'mail';
  if (text.includes('search') || text.includes('find')) return 'search';
  if (text.includes('api') || text.includes('web')) return 'web';
  if (text.includes('document') || text.includes('file')) return 'document';
  
  return 'settings';
}

/**
 * Generate mock inputs for testing (temporary)
 */
function generateMockInputs(name: string): Record<string, any> {
  const text = name.toLowerCase();
  
  if (text.includes('user') || text.includes('input')) {
    return {
      firstName: '{{user.firstName}}',
      lastName: '{{user.lastName}}',
      email: '{{user.email}}',
    };
  }
  
  if (text.includes('ai') || text.includes('reasoning')) {
    return {
      prompt: 'Analyze the data: {{input.data}}',
      model: 'gpt-4',
      temperature: 0.7,
    };
  }
  
  return {};
}

/**
 * Generate mock outputs for testing (temporary)
 */
function generateMockOutputs(name: string): Array<{ name: string; type: string }> {
  const text = name.toLowerCase();
  
  if (text.includes('user') || text.includes('input')) {
    return [
      { name: 'userData', type: 'Object' },
      { name: 'isValid', type: 'Boolean' }
    ];
  }
  
  if (text.includes('ai') || text.includes('reasoning')) {
    return [
      { name: 'analysis', type: 'String' },
      { name: 'confidence', type: 'Number' }
    ];
  }
  
  return [
    { name: 'result', type: 'Object' },
    { name: 'success', type: 'Boolean' }
  ];
}

/**
 * Parse a malformed node string from backend (handles the backend bug)
 * Input example: "id='HttpRequestNode_62416' name='HttpRequestNode' type='HttpRequestNode' params=[...] loop_over=None"
 */
function parseNodeString(nodeStr: string): InternalWorkflowNode | null {
  try {
    // Extract id, name, type from the string using regex
    const idMatch = nodeStr.match(/id=['"]([^'"]+)['"]/);
    const nameMatch = nodeStr.match(/name=['"]([^'"]+)['"]/);
    const typeMatch = nodeStr.match(/type=['"]([^'"]+)['"]/);
    
    if (!idMatch || !nameMatch || !typeMatch) {
      console.warn('Could not parse node string:', nodeStr);
      return null;
    }
    
    const nodeId = idMatch[1];
    const name = nameMatch[1];
    const type = typeMatch[1];
    
    // Extract params if they exist
    const params: Record<string, any> = {};
    const paramsMatch = nodeStr.match(/params=\[(.*?)\]/);
    if (paramsMatch) {
      const paramsStr = paramsMatch[1];
      // Parse individual NodeParams - this is a simple regex approach
      const paramMatches = paramsStr.match(/NodeParams\(param_name=['"]([^'"]+)['"], param_value=([^)]+)\)/g);
      if (paramMatches) {
        for (const paramMatch of paramMatches) {
          const paramNameMatch = paramMatch.match(/param_name=['"]([^'"]+)['"]/);
          const paramValueMatch = paramMatch.match(/param_value=(.+)/);
          if (paramNameMatch && paramValueMatch) {
            const paramName = paramNameMatch[1];
            let paramValue = paramValueMatch[1].replace(/\)$/, ''); // Remove trailing )
            
            // Clean up the value - remove quotes and handle arrays
            if (paramValue.startsWith("'") && paramValue.endsWith("'")) {
              paramValue = paramValue.slice(1, -1);
            } else if (paramValue.startsWith('[') && paramValue.endsWith(']')) {
              try {
                paramValue = JSON.parse(paramValue.replace(/'/g, '"'));
              } catch {
                // Keep as string if JSON parse fails
              }
            }
            
            params[paramName] = paramValue;
          }
        }
      }
    }
    
    // Extract loop_text if it exists
    let loop_text: string | null = null;
    const loopMatch = nodeStr.match(/loop_over=([^,\]]+)/);
    if (loopMatch && loopMatch[1] !== 'None') {
      loop_text = loopMatch[1].replace(/['"]/g, '');
    }
    
    return {
      nodeId,
      name,
      description: `${type} node`, // Generate description from type
      status: 'configured' as const,
      params,
      loop_text,
      category: inferNodeCategory(name, type),
      icon: inferNodeIcon(name, type),
      inputs: params, // Use params as inputs
      outputs: generateMockOutputs(name),
    };
  } catch (error) {
    console.error('Error parsing node string:', error, nodeStr);
    return null;
  }
}

/**
 * Extract connections from node parameters by finding variable references
 * Example: "{{$HttpRequestNode_62416.body}}" creates connection from HttpRequestNode_62416 to current node
 */
export function extractConnectionsFromNodes(nodes: InternalWorkflowNode[]): InternalConnection[] {
  const connections: InternalConnection[] = [];
  const connectionSet = new Set<string>(); // Prevent duplicates
  
  for (const node of nodes) {
    if (node.params) {
      for (const [paramKey, paramValue] of Object.entries(node.params)) {
        if (typeof paramValue === 'string') {
          // Find variable references like {{$NodeId.output}}
          const variableMatches = paramValue.match(/\{\{\$([^.}]+)[^}]*\}\}/g);
          if (variableMatches) {
            for (const match of variableMatches) {
              const nodeIdMatch = match.match(/\{\{\$([^.}]+)/);
              if (nodeIdMatch) {
                const sourceNodeId = nodeIdMatch[1];
                // Check if the source node exists
                if (nodes.some(n => n.nodeId === sourceNodeId) && sourceNodeId !== node.nodeId) {
                  const connectionId = `${sourceNodeId}_to_${node.nodeId}`;
                  if (!connectionSet.has(connectionId)) {
                    connections.push({
                      source: sourceNodeId,
                      target: node.nodeId,
                      id: `edge_${sourceNodeId}_${node.nodeId}`,
                    });
                    connectionSet.add(connectionId);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return connections;
}

/**
 * Validate and sanitize data to prevent crashes from malformed backend data
 */
export function sanitizeEventData(event: SSEEvent): SSEEvent {
  if (!isSSEStepEvent(event)) {
    return event; // System events pass through as-is
  }

  // Ensure data object exists
  if (!event.data || typeof event.data !== 'object') {
    console.warn('Invalid or missing data in SSE event:', event);
    return {
      ...event,
      data: {} as any,
    };
  }

  // Handle specific data validation
  switch (event.step) {
    case 'node_selector':
      const nodeData = event.data as any;
      if (!Array.isArray(nodeData.nodes)) {
        console.warn('Invalid nodes data:', nodeData);
        return {
          ...event,
          data: { nodes: [] } as NodeSelectorData,
        };
      }
      break;

    case 'connection_builder':
      const connData = event.data as any;
      if (!Array.isArray(connData.connections)) {
        console.warn('Invalid connections data:', connData);
        return {
          ...event,
          data: { connections: [] } as ConnectionBuilderData,
        };
      }
      break;

    case 'database_setup':
      const dbData = event.data as any;
      if (!Array.isArray(dbData.databases)) {
        console.warn('Invalid databases data:', dbData);
        return {
          ...event,
          data: { databases: [] } as DatabaseSetupData,
        };
      }
      break;
  }

  return event;
}

/**
 * Convert internal workflow nodes to React Flow nodes
 */
export function internalNodesToReactFlowNodes(nodes: InternalWorkflowNode[]): ReactFlowNode[] {
    // This is a simplified transformation. You might need to expand it
    // based on the specific data structure of your generation nodes.
    return nodes.map((node, index) => ({
        id: node.nodeId,
        type: 'simple', // Or map to a specific node type
        position: { x: 100, y: index * 100 }, // Basic layout
        data: {
            label: node.name,
            description: node.description,
            // Pass other relevant data
        },
    }));
}

/**
 * Convert internal connections to React Flow edges
 */
export function internalConnectionsToReactFlowEdges(connections: InternalConnection[]): ReactFlowEdge[] {
    return connections.map(conn => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        type: 'default', // Or your custom edge type
    }));
}

/**
 * Convert mock nodes to a format usable by the workflow builder
 */
export function mockNodesToWorkflow(mockNodes: InternalWorkflowNode[], originalPrompt: string): {
    name: string;
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
} {
    return {
        name: `Generating: ${originalPrompt.slice(0, 50)}${originalPrompt.length > 50 ? '...' : ''}`,
        nodes: internalNodesToReactFlowNodes(mockNodes),
        edges: [], // No connections for mock nodes
    };
}

/**
 * Convert the entire generation state to a format usable by the workflow builder
 */
export function generationStateToWorkflow(state: GenerationState, customName?: string): {
    name: string;
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
} {
    // Use custom name if provided, otherwise find the user's initial prompt to use as the workflow name
    let workflowName = customName;
    
    if (!workflowName) {
        const initialPrompt = state.chatMessages.find(msg => msg.type === 'system');
        workflowName = initialPrompt ? initialPrompt.content : 'Generated Workflow';
    }

    return {
        name: workflowName,
        nodes: internalNodesToReactFlowNodes(state.nodes),
        edges: internalConnectionsToReactFlowEdges(state.connections),
    };
}
