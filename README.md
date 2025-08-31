# Workflow Generation UI - Frontend Contractor Task

## Overview

This is a frontend engineering task focused on improving the workflow generation interface for an AI-powered automation platform. The application allows users to create workflows using natural language, which are then visualized in a real-time canvas with nodes and connections.

## Setup Instructions

1. **Start the development server (in the main directory):**
   ```bash
   npm install
   npm run dev
   ```
   The application will run on `http://localhost:3000`

2. **Install and start the mock server (in a separate terminal):**
   ```bash
   cd mock-server
   npm install
   npm start
   ```
   The mock server will run on `http://localhost:4000`

3. **Test the workflow:**
   - Navigate to `http://localhost:3000/generate-workflow`
   - Click on any of the 5 workflow suggestion cards (or type your own prompt)
   - The workflow generation will begin streaming in real-time
   - Watch as nodes appear, get configured, and connections are built

## Task Requirements

Your goal is to improve the workflow generation UI with focus on both technical implementation and design quality. Here are the specific tasks:

### A. Implement Better Node Layout with d3-flextree

**Current State:** The application uses `dagre` for automatic node layout, which works but doesn't create optimal hierarchical visualizations.

**Requirements:**
- Replace the current dagre layout with `d3-flextree` for better hierarchical tree visualization
- Implement the new layout in `src/components/generation-canvas.tsx` (see `getLayoutedElements` function)
- Ensure the layout works well for:
  - Simple linear workflows (3-5 nodes)
  - Complex branching workflows (~10 nodes with parallel paths)
- The layout should avoid node overlaps and maintain clear visual hierarchy
- Support smooth transitions when nodes are added during generation

**Files to modify:**
- `src/components/generation-canvas.tsx`

### B. Enhanced Node Input/Output Display

**Current State:** Nodes show basic badges for inputs and outputs, which doesn't clearly communicate data flow.

**Requirements:**
- Redesign how inputs and outputs are displayed within nodes
- Consider:
  - Visual hierarchy between node name, description, inputs, and outputs
  - Clear connection points that show where edges connect
  - Different visual treatments for different data types (string, array, object, etc.)
  - Status indicators for configuration state
  - Zoom-responsive design (details visible when zoomed in, simplified when zoomed out)
- Maintain consistency with the existing design system (Tailwind + ShadCN)

**Files to modify:**
- `src/components/workflow-generation-node.tsx`

### C. Modern Chat Experience

**Current State:** Basic chat interface with collapsible messages showing generation progress.

**Requirements:**
- Upgrade the chat interface with modern UX patterns
- Improvements should include:
  - Better message visualization for different step types
  - Enhanced progress indicators for ongoing steps
  - Improved error state displays
  - Better visual hierarchy for message history
  - Smooth animations and transitions
- Consider how to display redundant or detailed information without overwhelming the user
- The chat should effectively capture and maintain user attention during the generation process
- Feel free to use component libraries such as [Kibo UI](https://www.kibo-ui.com/components/ai-conversation), [assistant-ui](https://www.assistant-ui.com/) etc. 

**Files to modify:**
- `src/components/workflow-chat.tsx`
- `src/app/workflows/[workflow-id]/page.tsx` (chat integration)

### D. Additional Improvements (not required but nice-to-have)

Feel free to implement any other UI/UX improvements you think would enhance the experience:
- Improved node status visualization (pulsing, progress indicators)
- Better feedback in chat panel during generation process
- Improved cards in the initial `/generate-workflow` page

## Mock Server

The mock server provides realistic workflow generation data through Server-Sent Events (SSE).

### Available Endpoints:
- `POST /workflow-generation/generate-workflow` - Initiates workflow generation
- `GET /generations/:id/stream` - SSE stream of generation events
- `GET /generate-initial-details` - Initial workflow metadata

### Test Scenarios:

You can test different workflow generation scenarios by changing the `TEST_FIXTURE` constant in `src/lib/api.ts` (line 26):

```typescript
// Change this to test different fixtures
const TEST_FIXTURE: 'happy' | 'branching' | 'error' = 'happy';
```

1. **'happy'** (default): Standard linear workflow with 6 nodes
   - DataSource → DocumentFetch → AI Processing → Document Create → Email → Message
   - Good for testing basic layouts and transitions

2. **'branching'**: Multiple input sources converging
   - 3 parallel scrapers (Web, Instagram, TikTok) → AI Analysis → Sheets → Report → Email
   - Good for testing complex layouts with multiple paths

3. **'error'**: Simulates generation failure
   - Tests error handling and recovery UI

You can also modify the fixture files in `mock-server/fixtures/` to test additional scenarios.

## Deliverables

1. **Modified codebase** with all improvements implemented
2. **Brief documentation** explaining:
   - Your design decisions and trade-offs
   - Any libraries or tools you added
   - Instructions for testing your changes
3. **Screenshots or screen recording** are very useful.

## Technical Notes

### Key Technologies:
- **Next.js 15** with App Router
- **TypeScript** (strict mode disabled for flexibility)
- **ReactFlow** for canvas and node management
- **Tailwind CSS** with ShadCN/UI components
- **Framer Motion** for animations
- **Server-Sent Events** for real-time updates

### Project Structure:
```
src/
├── app/                    # Next.js pages
│   ├── generate-workflow/  # Initial prompt page
│   └── workflows/          
│       └── [workflow-id]/  # Main workflow view
├── components/            
│   ├── ui/                # ShadCN components
│   ├── generation-canvas.tsx
│   ├── workflow-generation-node.tsx
│   └── workflow-chat.tsx
├── hooks/
│   ├── use-generation-state.ts  # SSE state management
│   └── use-sse.ts              # SSE connection
├── lib/
│   ├── api.ts                   # API client
│   ├── generation-transformers.ts # Data transformations
│   └── cn.ts                    # Utility functions
└── types/
    └── generation.ts            # TypeScript types
```

### Important Files:
- Canvas logic: `src/components/generation-canvas.tsx`
- Node component: `src/components/workflow-generation-node.tsx`
- Chat interface: `src/components/workflow-chat.tsx`
- Data transformations: `src/lib/generation-transformers.ts`
- Generation state: `src/hooks/use-generation-state.ts`

## Notes

1. **Mock Server Behavior:**
   - Streams events with randomized delays (2-10 seconds) to simulate real processing
   - Each fixture demonstrates different node configurations and connection patterns
   - The server maintains generation state in memory

2. **Visual Effects:**
   - Mock nodes appear with a purple shimmer animation initially
   - Real nodes replace mock nodes as they're selected
   - Nodes pulse during configuration (when `node_configurator` is processing)
   - Connections appear after all nodes are placed

3. **Chat Behavior:**
   - Only two messages appear in chat during generation:
     - Initial user prompt (shown as system message)
     - Final completion message
   - All other generation steps update the canvas visually without chat messages (feel free to suggest improvements in the use of the chat panel)

4. **Testing Tips:**
   - Test with different zoom levels to ensure UI scales properly
   - Try resizing the chat panel to test responsive behavior
   - Test the minimize/expand chat functionality
   - Verify animations are smooth during node addition
