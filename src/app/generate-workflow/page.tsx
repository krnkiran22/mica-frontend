"use client";

import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { SparklesIcon, BarChart3, FileText, Headphones, Eye, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

const WORKFLOW_SUGGESTIONS = [
  {
    title: "Data Analysis Agent",
    icon: BarChart3,
    detailedPrompt: "We have daily pricing data stored in our data lake. Pull this data in from our data lake every morning at 9am and generate a report on price changes for the day broken down by brand and retailer. Generate this report and match the styles of the document in our template. Email this report to our sales team every morning and send me a message once you do."
  },
  {
    title: "Lead Enrichment Agent",
    icon: UserPlus,
    detailedPrompt: "Given a company name, find the best leads on LinkedIn that are VP or above working in the Finance department, enrich their contact information, and analyze their profile to craft a personalized outreach message. Add the list of leads, information, and the message in a spreadsheet and share the link with me."
  },
  {
    title: "Support Ticket Router",
    icon: Headphones,
    detailedPrompt: "Design an agent that ingests customer support tickets from multiple channels, analyzes the content using AI to determine urgency and sentiment, categorizes issues by type and department, and automatically routes high-priority tickets to senior agents."
  },
  {
    title: "Social Media Monitor",
    icon: Eye,
    detailedPrompt: "Create a comprehensive social media monitoring system that tracks mentions of your brand across platforms, analyzes sentiment and engagement metrics, identifies influencers and key conversations, categorizes mentions by topic and urgency, and generates weekly reports with insights and recommended actions for the marketing team."
  },
  {
    title: "Document Analyzer",
    icon: FileText,
    detailedPrompt: "Build an agent that parses a PDF file to extract the text, summarizes the key points, and adds it to a table. When the process is complete, send me a notification with the link to the table."
  }
];

export default function GenerateWorkflowPage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.generateWorkflow(message);
      
      // Navigate to workflow page
      const url = `/workflows/${data.workflow_id}?generation-id=${data.generation_id}`;
      router.push(url);
    } catch (error) {
      setError("Failed to generate workflow. Please try again.");
      console.error("Error generating workflow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="w-full flex justify-center mb-2">
          <SparklesIcon className="h-7 w-7 text-black" />
        </div>
        <h1 className="text-4xl font-bold mb-8 text-center">
          What can I help you automate?
        </h1>
        <div className="w-full animate-slit-in-horizontal">
          <form
            onSubmit={handleSend}
            className="w-full flex flex-col gap-3 border border-gray-200 rounded-2xl bg-white animated-purple-shadow"
          >
            <TextareaAutosize
              className="w-full p-3 rounded-2xl focus:outline-none transition resize-none"
              minRows={1}
              maxRows={6}
              placeholder="Describe your workflow..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
              disabled={isLoading}
            />
            {error && (
              <div className="mx-3 p-2 text-sm text-destructive bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}
            <div className="m-2">
              <div className="grid grid-cols-2 gap-2 px-2 pb-1">
                {WORKFLOW_SUGGESTIONS.map((suggestion, idx) => {
                  const IconComponent = suggestion.icon;
                  return (
                    <HoverCard key={idx}>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-12 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs rounded-lg px-3 border border-gray-100 transition text-left flex items-center cursor-pointer gap-2"
                          onClick={() => setMessage(suggestion.detailedPrompt)}
                          disabled={isLoading}
                        >
                          <IconComponent className="h-4 w-4 flex-shrink-0" />
                          <span className="text-base font-semibold">{suggestion.title}</span>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 p-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {suggestion.detailedPrompt}
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
              <div className="flex justify-end m-2">
                <button
                  type="submit"
                  className={`${
                    isLoading || !message.trim()
                      ? "bg-gray-300 cursor-not-allowed" 
                      : "bg-black hover:bg-gray-900"
                  } text-white w-9 h-9 flex items-center justify-center rounded-xl transition font-semibold`}
                  aria-label="Send"
                  disabled={isLoading || !message.trim()}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}