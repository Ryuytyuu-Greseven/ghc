import {
  ChatVertexAI,
  type ChatVertexAIInput,
} from '@langchain/google-vertexai';
import { config } from 'dotenv';
import { patchConnectionFormatData } from './thought-signature.util';

config();

class ChatVertexAIWithThoughtBypass extends ChatVertexAI {
  constructor(fields?: ChatVertexAIInput) {
    super(fields);
    patchConnectionFormatData(this.connection);
    patchConnectionFormatData(this.streamedConnection);
  }
}

const generateInstance = () => {
  return new ChatVertexAIWithThoughtBypass({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'gemini-3.5-flash',
    temperature: 0,
    cache: true,
    disableStreaming: false,
    streaming: true,
    vertexai: true,
    // thinkingBudget: 0,
  });
};

export const llmInstance = generateInstance();
