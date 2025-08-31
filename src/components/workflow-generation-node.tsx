"use client"

import React, { useState, useMemo } from "react"
import { Handle, Position, NodeProps, useStore } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, ChevronDown, ChevronRight, RepeatIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Types for our node data
interface WorkflowGenerationNodeData {
  nodeId: string
  name: string
  nodeType: string
  description: string
  status?: 'idle' | 'configuring' | 'configured' | 'generating'
  params?: Record<string, any>
  loop_text?: string | null
  category?: 'Input' | 'Processing' | 'AI' | 'Output'
  outputs?: Array<{
    name: string
    type: string
  }>
  isMock?: boolean
  isArchitecturePlanner?: boolean
}

// Hook to get current zoom level from React Flow
const useZoomLevel = () => {
  const zoom = useStore((s) => s.transform[2])
  return zoom
}

// Component for highlighting template variables
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\{\{\$[^}]+\}\})/g)
  
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\{\{\$([^}]+)\}\}$/)
        if (match) {
          // This is a template variable - render as a pill, only show the inside
          return (
            <Badge 
              key={index} 
              variant="secondary" 
              className="bg-blue-100 text-blue-700 text-xs border border-blue-300"
            >
              {match[1]}
            </Badge>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

// Component for collapsible parameter values
const CollapsibleValue: React.FC<{ 
  value: any
  maxLength?: number 
}> = ({ value, maxLength = 100 }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const stringValue = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  const shouldTruncate = stringValue.length > maxLength

  if (!shouldTruncate) {
    return <HighlightedText text={stringValue} />
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">
        {isExpanded ? (
          <HighlightedText text={stringValue} />
        ) : (
          <HighlightedText text={stringValue.substring(0, maxLength) + "..."} />
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "Show less" : "Show more"}
      </Button>
    </div>
  )
}

// Main workflow generation node component
export function WorkflowGenerationNode({ data, isConnectable }: NodeProps<WorkflowGenerationNodeData>) {
  const zoom = useZoomLevel()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['params']))

  // Determine detail level based on zoom
  const getDetailLevel = () => {
    if (zoom < 0.5) return 'minimal' // Name + status only
    if (zoom < 1.0) return 'standard' // Name + description + status
    return 'detailed' // Everything including parameters
  }

  const detailLevel = getDetailLevel()

  // Get category styles
  const getCategoryStyles = () => {
    const categoryMap = {
      'Input': 'bg-blue-500',
      'Processing': 'bg-green-500', 
      'AI': 'bg-indigo-500',
      'Output': 'bg-orange-500'
    }
    return categoryMap[data.category || 'Processing'] || 'bg-gray-500'
  }

  // Get status icon
  const getStatusIcon = () => {
    switch (data.status) {
      case 'configuring':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
      case 'configured':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'generating':
        return <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
      default:
        return null
    }
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Calculate node dimensions based on detail level
  const getNodeDimensions = () => {
    switch (detailLevel) {
      case 'minimal':
        return { width: 140, minHeight: 60 }
      case 'standard':
        return { width: 200, minHeight: 100 }
      case 'detailed':
        return { width: 280, minHeight: 120 }
      default:
        return { width: 200, minHeight: 100 }
    }
  }

  const dimensions = getNodeDimensions()

  return (
    <motion.div
      className={`relative ${data.status === 'configuring' ? 'animate-pulse' : ''} ${data.status === 'generating' ? 'mock-node-shimmer' : ''}`}
      style={{ width: dimensions.width, minHeight: dimensions.minHeight }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Repeat indicator */}
      {data.loop_text && (
        <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center shadow-md border border-blue-300 z-10">
          <RepeatIcon className="h-2.5 w-2.5 mr-0.5" />
          {data.loop_text}
        </div>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '8px',
          height: '8px',
          left: '-4px',
          background: '#f8fafc',
          border: detailLevel === 'minimal' ? '1px solid #3b82f6' : '2px solid #3b82f6',
          borderRadius: '50%',
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />

      {/* Main Card */}
      <Card 
        className={`
          border-1 hover:shadow-md transition-all duration-200 overflow-hidden
          ${data.status === 'configuring' ? 'border-blue-400' : 'border-gray-200 dark:border-gray-700'}
          ${data.status === 'configured' ? 'border-green-400' : ''}
          ${data.status === 'generating' ? 'border-dashed border-2 border-purple-300 opacity-75' : ''}
          ${data.isMock ? 'mock-node-shimmer' : ''}
          ${data.isArchitecturePlanner ? 'architecture-planner-node' : ''}
        `}
      >
        {/* Header */}
        <CardHeader 
          className={`${getCategoryStyles()} text-white px-4 py-3`}
          style={{ fontSize: '0.75rem' }}
        >
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium truncate flex-1 mr-2">
              {data.category}
            </CardTitle>
            <div className="flex items-center gap-1 flex-shrink-0">
              {getStatusIcon()}
              {/* {detailLevel !== 'minimal' && data.category && (
                <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1 py-0">
                  {data.category}
                </Badge>
              )} */}
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-3 bg-white dark:bg-gray-800 border-x">
          <div className="font-medium text-sm">{data.name}</div>
          {/* Description - shown in standard and detailed levels */}
          {detailLevel !== 'minimal' && data.description && (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground mt-1">
                {detailLevel === 'standard' 
                  ? data.description.length > 80 
                    ? data.description.substring(0, 80) + "..."
                    : data.description
                  : data.description
                }
              </p>
            </div>
          )}
          {/* Node Type - shown only in standard level */}
          {(detailLevel === 'standard' || detailLevel === 'detailed') && data.nodeType && (
            <div className="mt-1 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded inline-block">
              {data.nodeType}
            </div>
          )}

          {/* Parameters - shown only in detailed level */}
          {detailLevel === 'detailed' && data.params && Object.keys(data.params).length > 0 && (
            <div className="space-y-2 mt-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">Parameters</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => toggleSection('params')}
                >
                  {expandedSections.has('params') ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </div>
              
              <AnimatePresence>
                {expandedSections.has('params') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    {Object.entries(data.params).map(([key, value]) => (
                      <div key={key} className="border-t border-gray-100 dark:border-gray-700 pt-2">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {key}:
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground pl-2">
                          <CollapsibleValue value={value} />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Inputs/Outputs - shown only in detailed level */}
          {detailLevel === 'detailed' && (data.outputs) && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Outputs</h5>
                  <div className="flex flex-wrap gap-1">
                    {data.outputs.map((output, index) => (
                      <Badge key={index} variant="outline" className="text-[10px]">
                        {output.name} ({output.type})
                      </Badge>
                    ))}
                  </div>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '8px',
          height: '8px',
          right: '-4px',
          background: '#f8fafc',
          border: detailLevel === 'minimal' ? '1px solid #3b82f6' : '2px solid #3b82f6',
          borderRadius: '50%',
          zIndex: 10,
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  )
}