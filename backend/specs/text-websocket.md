# Unified Chat WebSocket — Frontend Integration Spec

## Overview

The backend exposes a single Socket.IO namespace at `/chat` for both **text** and **voice** interactions. The same supervisor + domain agents run for both modes; voice adds STT input and TTS output on top of the shared agent pipeline.

```
URL:       ws://<host>:<port>/chat
Namespace: /chat
Transport: websocket (prefer over polling)
```

### Connect (socket.io client)

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
});
```

On successful connection the server immediately emits:

```json
{ "event": "session:ready", "data": { "sessionId": "<socket-id>" } }
```

One socket per open chat panel preserves conversation history when switching between text and voice tabs.

---

## Event Reference

### Client → Server

| Event | Payload | When to emit |
|---|---|---|
| `message:send` | `{ text: string }` | Text mode — doctor sends a typed message |
| `audio:chunk` | `ArrayBuffer` (raw audio bytes) | Voice mode — every chunk from `MediaRecorder` |
| `session:reset` | _(none)_ | Clear conversation history |

### Server → Client (shared)

| Event | Payload | Meaning |
|---|---|---|
| `session:ready` | `{ sessionId: string }` | Connection established |
| `agent:chunk` | `{ text: string }` | One streamed token of the AI response |
| `agent:done` | `{ text: string }` | Full AI response text |
| `agent:preempted` | _(none)_ | New query started — stop audio, clear partial text |
| `error` | `{ message: string }` | Pipeline error |
| `session:reset` | `{ ok: true }` | Acknowledgement of reset |

### Server → Client (voice only)

| Event | Payload | Meaning |
|---|---|---|
| `transcript:partial` | `{ text: string }` | Live interim STT result |
| `transcript:final` | `{ text: string }` | Utterance fully recognized |
| `audio:response` | `ArrayBuffer` (MP3 binary) | One chunk of TTS audio |
| `audio:done` | _(none)_ | All TTS audio chunks sent |

---

## Text Mode Flow

```
Doctor types message
    │
    socket.emit('message:send', { text: 'List all patients' })
    │
    │◄──── agent:chunk  { text: "Here" }
    │◄──── agent:chunk  { text: " are" }
    │◄──── agent:done   { text: "Here are 12 patients..." }
```

No TTS or transcript events in text mode.

---

## Voice Mode Flow

Same as the previous `/voice` spec: mic streams `audio:chunk`, STT emits `transcript:*`, agent streams text, TTS streams `audio:response` / `audio:done`.

---

## Text Mode Implementation

```js
socket.on('session:ready', () => {
  // ready to send messages
});

function sendMessage(text) {
  socket.emit('message:send', { text });
}

socket.on('agent:chunk', ({ text }) => {
  appendToStreamingBubble(text);
});

socket.on('agent:done', ({ text }) => {
  finalizeBotMessage(text);
});

socket.on('agent:preempted', () => {
  clearStreamingBubble();
});

socket.on('error', ({ message }) => {
  showError(message);
});
```

---

## Session Reset

```js
socket.emit('session:reset');
socket.once('session:reset', () => {
  clearMessages();
  stopAudio(); // voice only
});
```

---

## Migration from `/voice`

| Old | New |
|---|---|
| `io('.../voice')` | `io('.../chat')` |
| _(no text events)_ | `message:send` |
| All other voice events | Unchanged |

---

## Quick-Start Checklist

- [ ] Connect to `ws://<host>/chat` with `transports: ['websocket']`
- [ ] Text: `message:send` on submit; handle `agent:chunk` / `agent:done`
- [ ] Voice: `audio:chunk` from mic; handle `transcript:*` + `audio:*`
- [ ] Both: handle `agent:preempted`, `error`, `session:reset`
- [ ] Use one socket while chat panel is open (shared history across modes)
