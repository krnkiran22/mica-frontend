import express, { Request, Response, NextFunction } from 'express';
import generateRouter from '../routes/generate';
import streamRouter from '../routes/stream';

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

// Enable CORS for all origins
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Simple console logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Parse incoming JSON
app.use(express.json());

// --------------------------------------------------
// Routes
// --------------------------------------------------

// Root route with timestamp
app.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initial details endpoint
app.get('/generate-initial-details', (_req, res) => {
  res.json({
    name: 'Sales Data Processing Pipeline',
    description: 'This workflow is used to process sales data and generate reports.',
    nodes: [
      'GetDatafromLakeNode',
      'AnalyzeDataNode',
      'GenerateReportNode',
      'SendEmailNode',
      'SendSlackMessageNode',
    ],
  });
});

// Workflow-generation routes
app.use('/workflow-generation', generateRouter);

// SSE stream route
app.use('/', streamRouter);

// Startup / Graceful shutdown
const PORT = Number(process.env.PORT) || 4000;
const server = app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});

// Handle Ctrl-C / kill gracefully
process.on('SIGINT', () => {
  console.log('Shutting down mock server…');
  server.close(() => {
    process.exit(0);
  });
});
