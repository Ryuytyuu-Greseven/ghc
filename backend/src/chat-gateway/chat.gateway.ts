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
import { AgentPipelineService } from '../Agents/agent-pipeline.service';
import { ChatSessionService } from './chat-session.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionService: ChatSessionService,
    private readonly agentPipeline: AgentPipelineService,
  ) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    this.sessionService.create(client.id);
    client.emit('session:ready', { sessionId: client.id });
    console.log(
      `[chat] connected: ${client.id} | total: ${this.sessionService.size()}`,
    );
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.sessionService.delete(client.id);
    console.log(
      `[chat] disconnected: ${client.id} | total: ${this.sessionService.size()}`,
    );
  }

  @SubscribeMessage('message:send')
  handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { text?: string },
  ) {
    const text = payload?.text?.trim();
    if (!text) return;

    const session = this.sessionService.get(client.id);
    if (!session) return;

    void this.agentPipeline.processUserMessage(
      (event, data) => client.emit(event, data),
      session,
      text,
      { synthesizeAudio: false },
    );
  }

  private sttCallbacks(client: Socket) {
    return {
      onFinal: (transcript: string) => this.onFinalTranscript(client, transcript),
      onInterim: (text: string) => client.emit('transcript:partial', { text }),
    };
  }

  @SubscribeMessage('audio:stream-start')
  handleAudioStreamStart(@ConnectedSocket() client: Socket) {
    const { onFinal, onInterim } = this.sttCallbacks(client);
    this.sessionService.prepareSttStream(client.id, onFinal, onInterim);
    return { ok: true };
  }

  @SubscribeMessage('audio:stream-end')
  handleAudioStreamEnd(@ConnectedSocket() client: Socket) {
    this.sessionService.resetSttStream(client.id);
  }

  @SubscribeMessage('audio:chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Buffer | ArrayBuffer | number[],
  ) {
    const callbacks = this.sttCallbacks(client);
    const session = this.sessionService.ensureSttStream(
      client.id,
      callbacks.onFinal,
      callbacks.onInterim,
    );
    if (!session) return;

    const chunk = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(payload as ArrayBuffer);
    this.sessionService.writeAudioChunk(client.id, chunk);
  }

  @SubscribeMessage('session:reset')
  handleSessionReset(@ConnectedSocket() client: Socket) {
    this.sessionService.reset(client.id);
    client.emit('session:reset', { ok: true });
  }

  private onFinalTranscript(client: Socket, transcript: string): void {
    const session = this.sessionService.get(client.id);
    if (!session || !transcript.trim()) return;

    void this.agentPipeline.processUserMessage(
      (event, data) => client.emit(event, data),
      session,
      transcript,
      { synthesizeAudio: true, emitTranscriptFinal: true },
    );
  }
}
