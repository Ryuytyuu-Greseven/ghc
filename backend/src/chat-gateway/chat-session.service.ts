import { Injectable } from '@nestjs/common';
import {
  createSpeechStream,
  type TranscribeOptions,
} from '../google/speech.service';
import type { ChatSession } from './chat-session.types';

@Injectable()
export class ChatSessionService {
  private readonly sessions = new Map<string, ChatSession>();

  create(socketId: string, transcribeOptions: TranscribeOptions = {}): ChatSession {
    const session: ChatSession = {
      socketId,
      conversationHistory: [],
      domain: '',
      isProcessing: false,
      transcribeOptions,
      abortController: null,
      processingDone: Promise.resolve(),
    };
    this.sessions.set(socketId, session);
    return session;
  }

  get(socketId: string): ChatSession | undefined {
    return this.sessions.get(socketId);
  }

  ensureSttStream(
    socketId: string,
    onFinal: (transcript: string) => void,
    onInterim: (transcript: string) => void,
  ): ChatSession | undefined {
    const session = this.sessions.get(socketId);
    if (!session) return undefined;

    session.sttHandlers = {
      onFinal,
      onInterim,
      onError: (err) => {
        console.error(`[stt:${socketId}] stream error:`, err.message);
        session.sttStream?.destroy();
        session.sttStream = undefined;
      },
    };

    if (session.sttStream && !session.sttStream.isAlive()) {
      session.sttStream.destroy();
      session.sttStream = undefined;
    }

    if (!session.sttStream) {
      console.log(`[stt:${socketId}] creating stream`);
      session.sttStream = createSpeechStream(
        session.sttHandlers,
        session.transcribeOptions,
      );
    }

    return session;
  }

  writeAudioChunk(socketId: string, chunk: Buffer): void {
    if (!chunk.length) return;

    const session = this.sessions.get(socketId);
    if (!session?.sttStream) return;

    session.sttStream.write(chunk);
  }

  resetSttStream(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.sttStream?.destroy();
    session.sttStream = undefined;
  }

  prepareSttStream(
    socketId: string,
    onFinal: (transcript: string) => void,
    onInterim: (transcript: string) => void,
  ): ChatSession | undefined {
    this.resetSttStream(socketId);
    return this.ensureSttStream(socketId, onFinal, onInterim);
  }

  reset(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.abortController?.abort();
    session.conversationHistory = [];
    session.domain = '';
  }

  delete(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.sessions.delete(socketId);
    session.abortController?.abort();
    session.sttStream?.destroy();
  }

  size(): number {
    return this.sessions.size;
  }
}
