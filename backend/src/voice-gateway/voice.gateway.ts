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
import { SessionService } from './session.service';
import { AgentPipelineService } from '../Agents/agent-pipeline.service';
import { httpLocalStorage } from '../common/services/http.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/voice' })
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly agentPipeline: AgentPipelineService,
  ) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    const lang = client.handshake.auth?.lang || 'en';
    const languageCode =
      lang === 'hi'
        ? 'hi-IN'
        : lang === 'te'
          ? 'te-IN'
          : lang === 'bn'
            ? 'bn-IN'
            : 'en-US';

    this.sessionService.create(
      client.id,
      (transcript) => this.onFinalTranscript(client, transcript),
      (text) => client.emit('transcript:partial', { text }),
      { languageCode },
    );
    client.emit('session:ready', { sessionId: client.id });
    console.log(
      `[voice] connected: ${client.id} | total: ${this.sessionService.size()}`,
    );
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.sessionService.delete(client.id);
    console.log(
      `[voice] disconnected: ${client.id} | total: ${this.sessionService.size()}`,
    );
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

  private onFinalTranscript(client: Socket, transcript: string): void {
    const session = this.sessionService.get(client.id);
    if (!session || !transcript.trim()) return;

    const token =
      client.handshake.auth?.token || client.handshake.headers?.authorization;
    const lang = client.handshake.auth?.lang || 'en';

    httpLocalStorage.run({ token, lang }, () => {
      void this.agentPipeline.processUserMessage(
        (event, data) => client.emit(event, data),
        session,
        transcript,
        { synthesizeAudio: true, emitTranscriptFinal: true },
      );
    });
  }
}
