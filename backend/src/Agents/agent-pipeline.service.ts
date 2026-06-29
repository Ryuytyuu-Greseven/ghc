import { Injectable } from '@nestjs/common';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { voiceAgentGraph } from './voice-agent';
import { synthesizeSpeech } from '../google/tts.service';
import { toPlainSpeechText } from './prompts/guardrails.prompt';
import { httpLocalStorage } from '../common/services/http.service';
import type {
  ChatEmit,
  ChatSession,
  ProcessUserMessageOptions,
} from '../chat-gateway/chat-session.types';

const TTS_CHUNK_SIZE = 64 * 1024;

@Injectable()
export class AgentPipelineService {
  async processUserMessage(
    emit: ChatEmit,
    session: ChatSession,
    text: string,
    options: ProcessUserMessageOptions = {},
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (session.isProcessing) {
      session.abortController?.abort();
      emit('agent:preempted', {});
      await session.processingDone;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;
    session.abortController = abortController;
    session.isProcessing = true;

    let finishRun!: () => void;
    session.processingDone = new Promise<void>((resolve) => {
      finishRun = resolve;
    });

    try {
      if (options.emitTranscriptFinal) {
        emit('transcript:final', { text: trimmed });
      }

      const graphInput = {
        transcript: trimmed,
        messages: [...session.conversationHistory, new HumanMessage(trimmed)],
        domain: '',
        finalResponse: '',
      };

      let fullResponse = '';

      for await (const event of voiceAgentGraph.streamEvents(graphInput, {
        version: 'v2',
      })) {
        if (signal.aborted) break;

        if (event.event === 'on_chain_end' && event.name === 'supervisor') {
          const output = event.data?.output as { domain?: string } | undefined;
          if (output?.domain) {
            session.domain = output.domain;
            console.log('[chat] routed domain:', output.domain);
          }
        }

        if (event.event === 'on_chat_model_stream') {
          // Ignore classification/intent classification streaming tokens
          const isClassification =
            event.tags?.includes('classification') ||
            event.metadata?.is_classification === true ||
            event.metadata?.langgraph_node === 'classify_intent';

          if (isClassification) {
            continue;
          }

          const content = event.data?.chunk?.content;
          if (typeof content === 'string' && content) {
            fullResponse += content;
            emit('agent:chunk', { text: content.replace(/\*+/g, '') });
          }
        }
      }
      if (signal.aborted) return;

      if (!fullResponse) {
        const result = await voiceAgentGraph.invoke(graphInput);
        session.domain = result.domain || session.domain;
        const last = result.messages[result.messages.length - 1];
        fullResponse =
          typeof last?.content === 'string'
            ? last.content
            : JSON.stringify(last?.content ?? '');
      }

      const plainResponse = toPlainSpeechText(fullResponse);
      emit('agent:done', { text: plainResponse });

      session.conversationHistory.push(new HumanMessage(trimmed));
      session.conversationHistory.push(new AIMessage(plainResponse));

      if (options.synthesizeAudio) {
        const store = httpLocalStorage.getStore();
        const lang = store?.lang || 'en';
        let ttsOptions = {};
        if (lang === 'hi') {
          ttsOptions = { languageCode: 'hi-IN', voiceName: 'hi-IN-Neural2-C' };
        } else if (lang === 'te') {
          ttsOptions = { languageCode: 'te-IN', voiceName: 'te-IN-Standard-A' };
        } else if (lang === 'bn') {
          ttsOptions = { languageCode: 'bn-IN', voiceName: 'bn-IN-Standard-A' };
        } else {
          ttsOptions = { languageCode: 'en-US', voiceName: 'en-US-Neural2-J' };
        }

        const audioBuffer = await synthesizeSpeech(plainResponse, ttsOptions);
        if (signal.aborted) return;

        for (
          let offset = 0;
          offset < audioBuffer.length;
          offset += TTS_CHUNK_SIZE
        ) {
          if (signal.aborted) break;
          emit(
            'audio:response',
            audioBuffer.subarray(offset, offset + TTS_CHUNK_SIZE),
          );
        }
        if (!signal.aborted) emit('audio:done', {});
      }
    } catch (err) {
      if (!signal.aborted) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        emit('error', { message });
        console.error(`[chat] error for ${session.socketId}:`, err);
      }
    } finally {
      session.isProcessing = false;
      session.abortController = null;
      finishRun();
    }
  }
}
