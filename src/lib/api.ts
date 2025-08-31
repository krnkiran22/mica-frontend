// Simplified API client 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface GenerateWorkflowResponse {
  workflow_id: string;
  generation_id: string;
}

export interface InitialDetailsResponse {
  name: string;
  description?: string;
  nodes: string[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async generateWorkflow(prompt: string): Promise<GenerateWorkflowResponse> {
    // Change this to test different fixtures
    // Options: 'happy', 'branching', 'error'
    const TEST_FIXTURE: 'happy' | 'branching' | 'error' = 'branching';
    
    const queryParams = new URLSearchParams();
    if (TEST_FIXTURE === 'error') {
      queryParams.append('error', '1');
    } else if (TEST_FIXTURE === 'branching') {
      queryParams.append('branching', '1');
    }

    const url = queryParams.toString() 
      ? `${this.baseUrl}/workflow-generation/generate-workflow?${queryParams}`
      : `${this.baseUrl}/workflow-generation/generate-workflow`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate workflow: ${response.statusText}`);
    }

    return response.json();
  }

  async getInitialDetails(generationId: string): Promise<InitialDetailsResponse> {
    const response = await fetch(`${this.baseUrl}/generations/${generationId}/generate-initial-details`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get initial details: ${response.statusText}`);
    }

    return response.json();
  }

  getStreamUrl(generationId: string): string {
    return `${this.baseUrl}/generations/${generationId}/stream`;
  }
}

export const api = new ApiClient();