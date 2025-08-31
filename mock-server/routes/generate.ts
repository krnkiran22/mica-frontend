import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface GenerationMeta {
  workflowId: string;
  fixture: 'happy' | 'error' | 'branching';
}

// In-memory lookup from generationId -> meta
export const generationRegistry = new Map<string, GenerationMeta>();

const router = Router();

/*
 * POST /workflow-generation/generate-workflow
 * Returns a mock { workflow_id, generation_id }
 * Accepts optional `?error=1` query param to force error fixture later.
 */
router.post('/generate-workflow', (req, res) => {
  const workflowId = uuidv4();
  const generationId = uuidv4();

  const isError = typeof req.query.error !== 'undefined';
  const isBranching = typeof req.query.branching !== 'undefined';
  
  let fixture: GenerationMeta['fixture'] = 'happy';
  if (isError) {
    fixture = 'error';
  } else if (isBranching) {
    fixture = 'branching';
  }

  generationRegistry.set(generationId, { workflowId, fixture });

  res.json({ workflow_id: workflowId, generation_id: generationId });
});

/*
 * GET /generations/:generation_id/generate-initial-details
 * Returns a mock { name, description, nodes }
 */
router.get('/generations/:id/generate-initial-details', (req, res) => {
  const { id } = req.params;
  const generation = generationRegistry.get(id);

  if (!generation) {
    res.status(404).json({ error: 'Unknown generation_id' });
    return;
  }

  // Return different initial details based on fixture type
  let response;
  if (generation.fixture === 'branching') {
    response = {
      name: 'Social Media Monitor',
      description: 'Comprehensive social media monitoring system that tracks brand mentions across multiple platforms.',
      nodes: ['WebSearchNode', 'InstagramScraperNode', 'TikTokScraperNode', 'LLMCallNode', 'GoogleSheetsUploadNode', 'SendEmailNode'],
    };
  } else {
    response = {
      name: 'Data analysis agent',
      description: 'This agent is used to analyze data and generate reports.',
      nodes: ['GetDatafromLakeNode', 'AnalyzeDataNode', 'GenerateReportNode'],
    };
  }

  res.json(response);
});

export default router;
