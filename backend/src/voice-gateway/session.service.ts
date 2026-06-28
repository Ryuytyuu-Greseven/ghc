import { Injectable } from '@nestjs/common';
import type { BaseMessage } from '@langchain/core/messages';
import {
  createSpeechStream,
  type SpeechStream,
  type SpeechStreamHandlers,
  type TranscribeOptions,
} from '../google/speech.service';

export interface VoiceSession {
  socketId: string;
  conversationHistory: BaseMessage[];
  domain: string;
  isProcessing: boolean;
  sttStream: SpeechStream;
  sttHandlers: SpeechStreamHandlers;
  transcribeOptions: TranscribeOptions;
  abortController: AbortController | null;
  processingDone: Promise<void>;
}

@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, VoiceSession>();

  create(
    socketId: string,
    onFinal: (transcript: string) => void,
    onInterim: (transcript: string) => void,
    transcribeOptions: TranscribeOptions = {},
  ): VoiceSession {
    const sttHandlers: SpeechStreamHandlers = {
      onFinal,
      onInterim,
      onError: (err) =>
        console.error(`[stt:${socketId}] stream error:`, err.message),
    };

    const session: VoiceSession = {
      socketId,
      conversationHistory: [],
      domain: '',
      isProcessing: false,
      sttHandlers,
      transcribeOptions,
      sttStream: createSpeechStream(sttHandlers, transcribeOptions),
      abortController: null,
      processingDone: Promise.resolve(),
    };

    this.sessions.set(socketId, session);
    return session;
  }

  get(socketId: string): VoiceSession | undefined {
    return this.sessions.get(socketId);
  }

  writeAudioChunk(socketId: string, chunk: Buffer): void {
    const session = this.sessions.get(socketId);
    if (!session) return;

    if (!session.sttStream.isAlive()) {
      console.log(`[stt:${socketId}] recreating stream`);
      session.sttStream = createSpeechStream(
        session.sttHandlers,
        session.transcribeOptions,
      );
    }

    session.sttStream.write(chunk);
  }

  delete(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.sessions.delete(socketId);
    session.abortController?.abort();
    session.sttStream.destroy();
  }

  size(): number {
    return this.sessions.size;
  }
}
