import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { generationRegistry } from './generate';
import { initSSE, sendSSE } from '../utils/sse';
import { randomDelay } from '../utils/randomDelay';

const router = Router();

router.get('/generations/:id/stream', async (req, res) => {
  const { id } = req.params;

  const meta = generationRegistry.get(id);
  if (!meta) {
    res.status(404).json({ error: 'Unknown generation_id' });
    return;
  }

  // Determine fixture file path
  const fixtureFile = path.join(__dirname, '..', 'fixtures', `${meta.fixture}.json`);

  let events: any[] = [];
  try {
    const raw = await fs.readFile(fixtureFile, 'utf-8');
    events = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load fixture', err);
    res.status(500).json({ error: 'Fixture load error' });
    return;
  }

  // Initialise SSE
  initSSE(res);

  let idx = 0;

  const pushNext = () => {
    if (idx >= events.length) {
      res.end();
      return;
    }

    const payload = events[idx];
    sendSSE(res, payload);
    idx += 1;

    // If error event, close stream immediately
    if (payload.status === 'error') {
      res.end();
      return;
    }

    setTimeout(pushNext, randomDelay());
  };

  // Kick off first send
  pushNext();
});

export default router;
