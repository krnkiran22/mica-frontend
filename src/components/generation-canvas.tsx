"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider,
  addEdge,
  Connection
} from "reactflow"
import "reactflow/dist/style.css"
import { WorkflowGenerationNode } from "./workflow-generation-node"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ZoomIn, ZoomOut, Maximize, Loader2, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { GenerationState, InternalWorkflowNode, InternalConnection } from "@/types/generation"
import dagre from "dagre"

// Node types for React Flow
const nodeTypes: NodeTypes = {
  workflowGeneration: WorkflowGenerationNode,
}

interface GenerationCanvasProps {
  generationState: GenerationState
  isConnected?: boolean
  className?: string
}

// Auto-layout function using dagre
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 150 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 280, height: 120 })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 140, // Center the node
        y: nodeWithPosition.y - 60,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Convert internal node to React Flow node
function convertToFlowNode(node: InternalWorkflowNode, index: number, totalNodes: number): Node {
  // Calculate initial position in a horizontal line (will be auto-layouted later)
  const spacing = 350
  const startX = 100
  const y = 200

  return {
    id: node.nodeId,
    type: 'workflowGeneration',
    position: { x: startX + (index * spacing), y },
    data: {
      nodeId: node.nodeId,
      name: node.name,
      nodeType: node.isMock ? 'node' : node.nodeId.split('_')[0], // Use 'node' for mock nodes, otherwise extract from nodeId
      description: node.description,
      status: node.status || 'idle',
      params: node.params,
      loop_text: node.loop_text?.replace(/^\{\{\$(.+)\}\}$/, '$1'),
      category: node.category,
      outputs: node.outputs || [],
      isMock: node.isMock,
      isArchitecturePlanner: node.isArchitecturePlanner
    },
    draggable: false, // Read-only during generation
  }
}

// Convert internal connection to React Flow edge
function convertToFlowEdge(connection: InternalConnection, index: number): Edge {
  return {
    id: connection.id || `edge-${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    type: 'step', // Better routing that avoids nodes
    animated: true,
    style: { 
      stroke: 'hsl(var(--primary))', 
      strokeWidth: 2 
    },
  }
}

// Status indicator component
const StatusIndicator: React.FC<{ state: GenerationState; isProcessingConnections?: boolean }> = ({ 
  state, 
  isProcessingConnections = false 
}) => {
  const getStatusInfo = () => {
    if (state.hasError) {
      return {
        icon: <div className="w-3 h-3 bg-red-500 rounded-full" />,
        text: "Generation failed",
        className: "bg-red-50 border-red-200 text-red-700"
      }
    }

    if (state.isComplete && !isProcessingConnections) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        text: "Workflow generation complete",
        className: "bg-green-50 border-green-200 text-green-700"
      }
    }

    // Override status for completed generations that are still animating connections
    if (state.isComplete && isProcessingConnections) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin text-purple-600" />,
        text: "Animating connections & progressive layout...",
        className: "bg-purple-50 border-purple-200 text-purple-700"
      }
    }

    if (state.currentStep === 'workflow_saver') {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin text-blue-600" />,
        text: "Saving workflow...",
        className: "bg-blue-50 border-blue-200 text-blue-700"
      }
    }

    if (state.currentStep === 'node_configurator') {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin text-orange-600" />,
        text: "Configuring nodes...",
        className: "bg-orange-50 border-orange-200 text-orange-700"
      }
    }

    if (state.currentStep === 'connection_builder' || isProcessingConnections) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin text-purple-600" />,
        text: "Building connections & organizing layout...",
        className: "bg-purple-50 border-purple-200 text-purple-700"
      }
    }

    if (state.currentStep === 'node_selector') {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />,
        text: "Selecting nodes...",
        className: "bg-indigo-50 border-indigo-200 text-indigo-700"
      }
    }

    // Handle case where generation is complete but no currentStep (loaded completed generation)
    if (state.nodes.length > 0 && !state.currentStep && !state.isComplete) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-blue-600" />,
        text: "Generation loaded",
        className: "bg-blue-50 border-blue-200 text-blue-700"
      }
    }

    return {
      icon: <Loader2 className="w-4 h-4 animate-spin text-gray-600" />,
      text: "Initializing...",
      className: "bg-gray-50 border-gray-200 text-gray-700"
    }
  }

  const status = getStatusInfo()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${status.className}`}
      >
        {status.icon}
        <span className="text-sm font-medium">{status.text}</span>
      </motion.div>
    </AnimatePresence>
  )
}

// Canvas shimmer overlay for when nodes are being added
const ShimmerOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent" />
    </div>
  )
}

// Main generation canvas component (inner - without provider)
const GenerationCanvasInner: React.FC<GenerationCanvasProps> = ({ 
  generationState,
  isConnected = false,
  className = "" 
}) => {

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isProcessingConnections, setIsProcessingConnections] = useState(false)
  const [lastNodeCount, setLastNodeCount] = useState(0)

  // Convert generation state nodes to flow nodes
  const flowNodes = useMemo(() => {
    // Use real nodes if available, otherwise use mock nodes
    const nodesToRender = generationState.nodes.length > 0 
      ? generationState.nodes 
      : generationState.mockNodes;
      
    console.log('🔄 Flow nodes recalculated:', {
      realNodesCount: generationState.nodes.length,
      mockNodesCount: generationState.mockNodes.length,
      renderingCount: nodesToRender.length,
      usingMockNodes: generationState.nodes.length === 0 && generationState.mockNodes.length > 0
    });
    
    return nodesToRender.map((node, index) => 
      convertToFlowNode(node, index, nodesToRender.length)
    )
  }, [generationState.nodes, generationState.mockNodes])

  // Update nodes when generation state changes (but don't reset connections for parameter updates)
  useEffect(() => {
    console.log('📝 Updating node display data (parameters, status, etc.) - connections should remain intact')
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  // Only reset connections when NODE COUNT changes, not when individual nodes get updated
  useEffect(() => {
    // Count total rendered nodes (real or mock)
    const currentNodeCount = generationState.nodes.length > 0 
      ? generationState.nodes.length 
      : generationState.mockNodes.length;
    
    // Reset connections only when we have new nodes (not when existing nodes get updated)
    if (currentNodeCount > lastNodeCount && currentNodeCount > 0) {
      console.log(`🔄 Node count changed: ${lastNodeCount} → ${currentNodeCount}, resetting connections`)
      setIsProcessingConnections(false)
      setEdges([]) // Clear existing edges to allow new connections
      setLastNodeCount(currentNodeCount)
    } else if (currentNodeCount < lastNodeCount) {
      // Handle case where nodes are removed (shouldn't happen in generation, but just in case)
      console.log(`🔄 Node count decreased: ${lastNodeCount} → ${currentNodeCount}, resetting connections`)
      setIsProcessingConnections(false)
      setEdges([])
      setLastNodeCount(currentNodeCount)
    } else if (lastNodeCount === 0 && currentNodeCount > 0) {
      // Initial case when first nodes appear
      setLastNodeCount(currentNodeCount)
    }
  }, [generationState.nodes.length, generationState.mockNodes.length, lastNodeCount, setEdges])

  // Handle connections - works for both real-time and completed generations
  useEffect(() => {
    if (generationState.connections.length > 0 && !isProcessingConnections && edges.length === 0) {
      console.log('🔗 Starting connection animations:', generationState.connections)
      console.log('📊 Generation status:', {
        isComplete: generationState.isComplete,
        currentStep: generationState.currentStep,
        hasRealNodes: generationState.nodes.length,
        hasMockNodes: generationState.mockNodes.length,
        hasConnections: generationState.connections.length
      })
      
      setIsProcessingConnections(true)
      
      // Process connections sequentially with progressive layout
      const processConnections = async () => {
        for (let i = 0; i < generationState.connections.length; i++) {
          const connection = generationState.connections[i]
          console.log(`➕ Adding connection ${i + 1}/${generationState.connections.length}:`, connection.source, '->', connection.target)
          
          const newEdge = convertToFlowEdge(connection, i)
          setEdges(prevEdges => [...prevEdges, newEdge])
          
          // Wait for connection to appear
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Apply progressive layout after each connection (except the first one)
          if (i > 0 && reactFlowInstance) {
            console.log(`🎯 Progressive layout after connection ${i + 1}`)
            
            const currentNodes = reactFlowInstance.getNodes()
            const currentEdges = reactFlowInstance.getEdges()
            
            if (currentNodes.length > 0 && currentEdges.length > 0) {
              const { nodes: layoutedNodes } = getLayoutedElements(currentNodes, currentEdges)
              
              // Update nodes with smooth transition (handled by global CSS)
              setNodes(layoutedNodes)
              
              // Wait for layout animation to settle
              await new Promise(resolve => setTimeout(resolve, 800))
            }
          } else if (i === 0) {
            // For first connection, just a short pause
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        // Final layout for good measure
        console.log('✅ All connections added, applying final layout')
        setIsProcessingConnections(false)
        
        if (reactFlowInstance) {
          const currentNodes = reactFlowInstance.getNodes()
          const currentEdges = reactFlowInstance.getEdges()
          
          if (currentNodes.length > 0 && currentEdges.length > 0) {
            const { nodes: layoutedNodes } = getLayoutedElements(currentNodes, currentEdges)
            
            // Final layout with smooth transition (handled by global CSS)
            setNodes(layoutedNodes)
            
            // Fit view after final layout with longer delay to account for transition
            setTimeout(() => {
              reactFlowInstance.fitView({ padding: 0.2, duration: 800 })
            }, 700)
          }
        }
      }
      
      processConnections()
    }
  }, [generationState.connections.length, generationState.isComplete, isProcessingConnections, edges.length, setEdges])

  // Removed: Auto-layout is now handled progressively within connection processing

  // Handle connections (shouldn't happen during generation, but just in case)
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds))
  }, [setEdges])

  // Show shimmer when nodes are being added or connections are being built
  const showShimmer = generationState.currentStep === 'node_selector' || 
                     generationState.currentStep === 'connection_builder'

  return (
    <div className={`relative w-full h-full bg-gray-50 ${className}`}>
      {/* Status indicator */}
      <div className="absolute top-4 left-4 z-20">
        <StatusIndicator state={generationState} isProcessingConnections={isProcessingConnections} />
      </div>

      {/* Shimmer overlay */}
      <ShimmerOverlay show={showShimmer} />

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'step',
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          animated: true,
        }}
        snapToGrid
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false} // Read-only during generation
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        fitView={false} // Prevent auto-fitting which causes zoom issues
        className="bg-gray-50"
      >
        <Background color="#aaa" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap 
          nodeColor="#f1f5f9"
          maskColor="rgba(255, 255, 255, 0.2)"
          pannable
          zoomable
        />
        
        {/* Custom zoom controls */}
        <Panel position="top-right" className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={() => reactFlowInstance?.zoomIn()}
            title="Zoom in to see details"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={() => reactFlowInstance?.zoomOut()}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}
            title="Fit view"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  )
}

// Wrapper component with ReactFlowProvider
export function GenerationCanvas(props: GenerationCanvasProps) {
  return (
    <ReactFlowProvider>
      <GenerationCanvasInner {...props} />
    </ReactFlowProvider>
  )
}