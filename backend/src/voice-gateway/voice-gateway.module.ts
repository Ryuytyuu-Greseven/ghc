import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { SessionService } from './session.service';

@Module({
  providers: [VoiceGateway, SessionService],
})
export class VoiceGatewayModule {}
