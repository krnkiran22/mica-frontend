"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardFooter, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
  MinimizeIcon,
  MaximizeIcon,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  steps?: string[]
  currentStep?: number
  isComplete?: boolean
  isCollapsed?: boolean
}

interface WorkflowChatProps {
  initialPrompt?: string
  onGenerateWorkflow: (prompt: string) => void
  generationSteps: string[]
  currentStep: number
  isGenerating: boolean
  isMinimized: boolean
  onMinimize: () => void
  onClose: () => void
}

export function WorkflowChat({
  initialPrompt,
  onGenerateWorkflow,
  generationSteps,
  currentStep,
  isGenerating,
  isMinimized,
  onMinimize,
  onClose,
}: WorkflowChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi there! I'm your workflow assistant. Describe what you want your workflow to do, and I'll help you build it.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState(initialPrompt || "")
  const [userInitials, setUserInitials] = useState("JD")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get user initials from localStorage or use default
  useEffect(() => {
    const storedName = localStorage.getItem("user-name") || "John Doe"
    const initials = storedName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    setUserInitials(initials)
  }, [])

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, currentStep])

  // Update generation steps in the message
  useEffect(() => {
    if (isGenerating && generationSteps.length > 0) {
      setMessages((prevMessages) => {
        // Find if we already have a generation message
        const generationMessageIndex = prevMessages.findIndex((msg) => msg.role === "assistant" && msg.steps)

        if (generationMessageIndex >= 0) {
          // Update existing generation message
          const updatedMessages = [...prevMessages]
          updatedMessages[generationMessageIndex] = {
            ...updatedMessages[generationMessageIndex],
            steps: generationSteps,
            currentStep: currentStep,
            isComplete: currentStep >= generationSteps.length - 1,
          }
          return updatedMessages
        } else {
          // No generation message exists yet
          return prevMessages
        }
      })
    }
  }, [isGenerating, generationSteps, currentStep])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // If this is the first message or a new prompt after completion
    if (!isGenerating) {
      // Add initial assistant response with steps
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "I'll create a workflow based on your description.",
        timestamp: new Date(),
        steps: generationSteps,
        currentStep: 0,
        isComplete: false,
        isCollapsed: false,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Trigger workflow generation
      onGenerateWorkflow(inputValue)
    }

    setInputValue("")
  }

  const toggleCollapseMessage = (id: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === id ? { ...msg, isCollapsed: !msg.isCollapsed } : msg)),
    )
  }

  if (isMinimized) {
    return (
      <div className="absolute bottom-6 right-6 z-10">
        <Button
          onClick={onMinimize}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full shadow-lg"
        >
          <SparklesIcon className="h-4 w-4" />
          <span>Workflow Assistant</span>
          <MaximizeIcon className="h-4 w-4 ml-2" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none bg-gray-50 dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Workflow Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMinimize} className="h-8 w-8">
            <MinimizeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
              {message.role === "assistant" && (
                <Avatar className="h-9 w-9 mt-1">
                  <AvatarFallback>AI</AvatarFallback>
                  <AvatarImage src="https://github.com/polymet-ai.png" alt="AI" />
                </Avatar>
              )}

              <div
                className={`max-w-[85%] ${message.role === "user" ? "bg-primary text-white" : "bg-white dark:bg-gray-800"} rounded-2xl p-4 shadow-sm`}
              >
                <div className="mb-1">{message.content}</div>

                {message.steps && (
                  <Collapsible open={!message.isCollapsed} className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCollapseMessage(message.id)}
                        className="h-7 px-2 text-xs flex items-center gap-1 w-full justify-between"
                      >
                        <span>{message.isCollapsed ? "Show details" : "Hide details"}</span>
                        {message.isCollapsed ? (
                          <ChevronDownIcon className="h-3 w-3" />
                        ) : (
                          <ChevronUpIcon className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-2 space-y-2">
                      {message.steps.slice(0, (message.currentStep || 0) + 1).map((step, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          {index > 1 && step.startsWith("Step") ? (
                            <CheckIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          ) : index > 6 && step.startsWith("Creating") ? (
                            <div className="h-4 w-4 flex items-center justify-center shrink-0">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                            </div>
                          ) : null}
                          <p className="text-sm">{step}</p>
                        </div>
                      ))}

                      {/* Typing indicator for the next step */}
                      {!message.isComplete && (
                        <div className="flex space-x-1 mt-2 ml-6">
                          <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"></div>
                          <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
                          <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
                        </div>
                      )}

                      {message.isComplete && (
                        <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Workflow generated successfully
                        </Badge>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {message.role === "user" && (
                <Avatar className="h-9 w-9 mt-1">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <CardFooter className="p-4 border-t bg-white dark:bg-gray-800">
        <div className="flex w-full items-center gap-2">
          <Input
            placeholder="Ask me to modify the workflow or create a new one..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="shrink-0 rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-white"
            disabled={!inputValue.trim() || isGenerating}
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
