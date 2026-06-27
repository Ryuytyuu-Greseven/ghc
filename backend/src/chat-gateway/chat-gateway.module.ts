import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatSessionService } from './chat-session.service';
import { AgentPipelineService } from '../Agents/agent-pipeline.service';

@Module({
  providers: [ChatGateway, ChatSessionService, AgentPipelineService],
})
export class ChatGatewayModule {}
