import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificationsGatewayService } from './notifications-gateway.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationsGatewayService: NotificationsGatewayService,
  ) {}

  afterInit(server: Server) {
    this.notificationsGatewayService.setServer(server);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        '';
      const token = String(rawToken).replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<{ sub: string; username?: string; role?: string }>(
        token,
      );
      if (!payload?.sub) {
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      client.emit('notifications:ready', { ok: true });
      this.logger.log(`[notifications] connected user=${payload.sub} socket=${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      this.logger.log(`[notifications] disconnected user=${userId} socket=${client.id}`);
    }
  }
}
