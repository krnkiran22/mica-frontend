# Mock Workflow-Generation Server

This lightweight Express + TypeScript service mimics the backend endpoints that the **GenerationViewer** front-end component will call.  It lets a contractor develop and demo the UI without access to Mica’s private infrastructure.

----------------------------------------------------------------
## Quick start

```bash
# inside the `mock-server` folder
npm install          # first time only

# run on http://localhost:4000
npm run mock
```

Set `PORT` in your shell if you need a different port.

----------------------------------------------------------------
## API surface

| Method & Path | Description |
|--------------|-------------|
| **POST** `/workflow-generation/generate-workflow[?error=1]` | Returns a fresh `workflow_id` and `generation_id`.  If the optional query `?error=1` is present the subsequent SSE stream will emit the **error** fixture. |
| **GET** `/generations/:generationId/stream` | Streams step events via **Server-Sent Events** (SSE).  See details below. |
| **GET** `/` | Sanity ping → `{ status:"ok" }` |
| **GET** `/health` | Health check with ISO timestamp. |

----------------------------------------------------------------
### How the SSE stream works

*   Response headers are `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
*   Every payload is sent as an SSE `message` event:

    ```text
    event: message
    data: {"step":"node_selector","status":"done","data":{…}}

    ```
    *(blank line terminates each event frame)*

*   A **random delay** between 2 s and 10 s is inserted before each next event to mimic real back-end latency.
*   If any event has `status:"error"` the stream closes immediately; otherwise it closes after the final event.

#### Consuming the stream in the browser

```ts
const es = new EventSource('http://localhost:4000/generations/<id>/stream');

es.onmessage = (evt) => {
  const payload = JSON.parse(evt.data);
  console.log(payload.step, payload.status, payload.data);
};

es.onerror = () => {
  console.warn('stream closed');
  es.close();
};
```

No custom headers are sent; CORS is wide-open (`Access-Control-Allow-Origin: *`) so the above works from any front-end dev host.

#### Consuming with curl (debugging)

```bash
curl -N http://localhost:4000/generations/<id>/stream
```

The `-N` flag disables curl’s default output buffering so you see events as they arrive.

----------------------------------------------------------------
## Fixtures

* `fixtures/happy.json` – complete success sequence.
* `fixtures/error.json` – emits an error during `node_configurator` and then stops.

Edit these files to experiment with more nodes/steps/latencies.

----------------------------------------------------------------
## Graceful shutdown

Press **Ctrl-C** in the terminal; the server logs *“Shutting down mock server…”* and exits only after active connections are closed.

----------------------------------------------------------------
## CORS

The server enables `cors({ origin: '*' })` so it is accessible from any local front-end dev server without additional proxying.
