import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const client = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export interface TtsOptions {
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
}

export async function synthesizeSpeech(
  text: string,
  options: TtsOptions = {},
): Promise<Buffer> {
  const {
    languageCode = 'en-US',
    voiceName = 'en-US-Neural2-J',
    speakingRate = 1.0,
  } = options;

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate,
      effectsProfileId: ['headphone-class-device'],
    },
  });

  return Buffer.from(response.audioContent as Uint8Array);
}
