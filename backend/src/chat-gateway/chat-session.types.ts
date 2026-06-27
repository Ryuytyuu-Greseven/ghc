import type { BaseMessage } from '@langchain/core/messages';
import type {
  SpeechStream,
  SpeechStreamHandlers,
  TranscribeOptions,
} from '../google/speech.service';

export interface ChatSession {
  socketId: string;
  conversationHistory: BaseMessage[];
  domain: string;
  isProcessing: boolean;
  abortController: AbortController | null;
  processingDone: Promise<void>;
  sttStream?: SpeechStream;
  sttHandlers?: SpeechStreamHandlers;
  transcribeOptions: TranscribeOptions;
}

export type ChatEmit = (event: string, data?: unknown) => void;

export interface ProcessUserMessageOptions {
  synthesizeAudio?: boolean;
  emitTranscriptFinal?: boolean;
}
