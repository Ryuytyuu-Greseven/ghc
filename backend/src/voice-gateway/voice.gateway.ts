import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { SessionService } from './session.service';
import { supervisorNode } from '../Agents/nodes/supervisor.node';
import { hospitalAgent } from '../Agents/nodes/hospital.node';
import { patientAgent } from '../Agents/nodes/patient.node';
import { medicineAgent } from '../Agents/nodes/medicine.node';
import { staffAgent } from '../Agents/nodes/staff.node';
import { synthesizeSpeech } from '../google/tts.service';
import { toPlainSpeechText } from '../Agents/prompts/guardrails.prompt';

const domainAgentMap: Record<string, any> = {
  hospital: hospitalAgent,
  patient: patientAgent,
  medicine: medicineAgent,
  staff: staffAgent,
};

const TTS_CHUNK_SIZE = 64 * 1024;

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/voice' })
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sessionService: SessionService) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    this.sessionService.create(
      client.id,
      (transcript) => this.onFinalTranscript(client, transcript),
      (text) => client.emit('transcript:partial', { text }),
    );
    client.emit('session:ready', { sessionId: client.id });
    console.log(`[voice] connected: ${client.id} | total: ${this.sessionService.size()}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.sessionService.delete(client.id);
    console.log(`[voice] disconnected: ${client.id} | total: ${this.sessionService.size()}`);
  }

  @SubscribeMessage('audio:chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Buffer | ArrayBuffer | number[],
  ) {
    const chunk = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(payload as ArrayBuffer);
    this.sessionService.writeAudioChunk(client.id, chunk);
  }

  @SubscribeMessage('session:reset')
  handleSessionReset(@ConnectedSocket() client: Socket) {
    const session = this.sessionService.get(client.id);
    if (session) {
      session.abortController?.abort();
      session.conversationHistory = [];
      session.domain = '';
    }
    client.emit('session:reset', { ok: true });
  }

  /**
   * Fires when Google STT emits isFinal: true.
   *
   * If a previous query is still in-flight, abort it immediately and tell the
   * client to stop any buffered audio playback, then start fresh with the new
   * transcript. History is only committed on a clean, non-aborted completion.
   */
  private async onFinalTranscript(client: Socket, transcript: string): Promise<void> {
    const session = this.sessionService.get(client.id);
    if (!session || !transcript.trim()) return;

    if (session.isProcessing) {
      // Preempt the running query
      session.abortController?.abort();
      // Tell the client to discard any buffered audio / partial text
      client.emit('agent:preempted', {});
      // Wait for the aborted run to fully exit its finally block
      await session.processingDone;
    }

    // ── set up this run ──────────────────────────────────────────────────────
    const abortController = new AbortController();
    const signal = abortController.signal;
    session.abortController = abortController;
    session.isProcessing = true;

    let finishRun!: () => void;
    session.processingDone = new Promise<void>((resolve) => {
      finishRun = resolve;
    });
    // ────────────────────────────────────────────────────────────────────────

    try {
      client.emit('transcript:final', { text: transcript });

      // 1. Classify domain
      const supervisorResult = await supervisorNode({
        transcript,
        messages: session.conversationHistory,
        domain: session.domain,
        finalResponse: '',
      });
      if (signal.aborted) return;

      const domain = supervisorResult.domain;
      session.domain = domain;

      // 2. Build agent input — don't mutate history yet (abort may cancel this)
      const agentMessages = [...session.conversationHistory, new HumanMessage(transcript)];
      const agent = domainAgentMap[domain] ?? patientAgent;

      // 3. Stream response tokens
      let fullResponse = '';

      for await (const event of agent.streamEvents(
        { messages: agentMessages },
        { version: 'v2' },
      )) {
        if (signal.aborted) break;
        if (event.event === 'on_chat_model_stream') {
          const content = event.data?.chunk?.content;
          if (typeof content === 'string' && content) {
            fullResponse += content;
            client.emit('agent:chunk', { text: content.replace(/\*+/g, '') });
          }
        }
      }
      if (signal.aborted) return;

      const plainResponse = toPlainSpeechText(fullResponse);
      client.emit('agent:done', { text: plainResponse });

      // 4. Commit to conversation history only on clean completion
      session.conversationHistory.push(new HumanMessage(transcript));
      session.conversationHistory.push(new AIMessage(plainResponse));

      // 5. TTS
      const audioBuffer = await synthesizeSpeech(plainResponse);
      if (signal.aborted) return;

      // 6. Stream audio chunks
      for (let offset = 0; offset < audioBuffer.length; offset += TTS_CHUNK_SIZE) {
        if (signal.aborted) break;
        client.emit('audio:response', audioBuffer.subarray(offset, offset + TTS_CHUNK_SIZE));
      }
      if (!signal.aborted) client.emit('audio:done', {});

    } catch (err) {
      // Errors caused by the abort itself are not forwarded to the client
      if (!signal.aborted) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        client.emit('error', { message });
        console.error(`[voice] error for ${client.id}:`, err);
      }
    } finally {
      session.isProcessing = false;
      session.abortController = null;
      finishRun();
    }
  }
}
