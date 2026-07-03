import { config } from 'dotenv';
import { v2 } from '@google-cloud/speech';

config();

const MAX_STREAMING_AUDIO_BYTES = 15 * 1024;

function getLocation(): string {
  return process.env.GOOGLE_CLOUD_LOCATION_IN ?? 'global';
}

function getApiEndpoint(): string | undefined {
  const loc = getLocation();
  return loc === 'global' ? undefined : `${loc}-speech.googleapis.com`;
}

let client: v2.SpeechClient | undefined;

function getClient(): v2.SpeechClient {
  if (!client) {
    const apiEndpoint = getApiEndpoint();
    client = new v2.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      ...(apiEndpoint ? { apiEndpoint } : {}),
    });
  }
  return client;
}

function getRecognizerPath(): string {
  if (process.env.GOOGLE_CLOUD_STT_RECOGNIZER) {
    return process.env.GOOGLE_CLOUD_STT_RECOGNIZER;
  }

  const projectId =
    process.env.GOOGLE_SPEECH_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
  const recognizerId = process.env.GOOGLE_CLOUD_STT_RECOGNIZER_ID ?? '_';
  const loc = getLocation();
  return `projects/${projectId}/locations/${loc}/recognizers/${recognizerId}`;
}

function writeStreamingAudio(
  stream: { write: (chunk: object) => void },
  chunk: Buffer,
): void {
  if (chunk.length <= MAX_STREAMING_AUDIO_BYTES) {
    stream.write({ audio: chunk });
    return;
  }

  for (
    let offset = 0;
    offset < chunk.length;
    offset += MAX_STREAMING_AUDIO_BYTES
  ) {
    stream.write({
      audio: chunk.subarray(offset, offset + MAX_STREAMING_AUDIO_BYTES),
    });
  }
}

export interface TranscribeOptions {
  encoding?: 'WEBM_OPUS' | 'LINEAR16' | 'FLAC' | 'MP3';
  sampleRateHertz?: number;
  languageCode?: string;
}

export interface SpeechStreamHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: Error) => void;
}

export interface SpeechStream {
  write: (chunk: Buffer) => void;
  end: () => void;
  destroy: () => void;
  isAlive: () => boolean;
}

export function createSpeechStream(
  handlers: SpeechStreamHandlers,
  options: TranscribeOptions = {},
): SpeechStream {
  const {
    encoding = 'WEBM_OPUS',
    sampleRateHertz = 48000,
    languageCode = 'en-US',
  } = options;

  const recognizerPath = getRecognizerPath();

  const stream = getClient()._streamingRecognize();
  let destroyed = false;
  let closed = false;

  const markDestroyed = () => {
    destroyed = true;
  };

  stream.on('finish', markDestroyed);
  stream.on('close', markDestroyed);

  stream.on('data', (response) => {
    const result = response.results?.[0];
    if (!result?.alternatives?.[0]) return;

    const transcript = result.alternatives[0].transcript ?? '';
    if (result.isFinal) {
      handlers.onFinal(transcript);
    } else {
      handlers.onInterim(transcript);
    }
  });

  stream.on('error', (err) => {
    markDestroyed();
    handlers.onError(err instanceof Error ? err : new Error(String(err)));
  });

  const decodingConfig =
    encoding === 'WEBM_OPUS'
      ? { autoDecodingConfig: {} }
      : {
        explicitDecodingConfig: {
          encoding,
          sampleRateHertz,
          audioChannelCount: 1,
        },
      };

  stream.write({
    recognizer: recognizerPath,
    streamingConfig: {
      config: {
        ...decodingConfig,
        languageCodes: [languageCode],
        model: 'chirp_3',
        alternative_language_codes: [
          "gu-IN",
          "hi-IN",
          "kn-IN",
          "ml-IN",
          "ta-IN",
          "te-IN",
        ],
      },
      streamingFeatures: {
        interimResults: true,
      },
    },
  });

  return {
    write: (chunk: Buffer) => {
      if (!destroyed && !closed) {
        writeStreamingAudio(stream, chunk);
      }
    },
    end: () => {
      if (destroyed || closed) return;
      stream.end();
    },
    destroy: () => {
      if (closed) return;
      closed = true;
      markDestroyed();
      stream.destroy();
    },
    isAlive: () => !destroyed && !closed,
  };
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscribeOptions = {},
): Promise<string> {
  const recognizerPath = getRecognizerPath();

  try {
    const base64Data = audioBuffer.toString('base64');
    const request = {
      recognizer: recognizerPath,
      config: {
        languageCodes: ['en-US'],
        model: 'chirp_3',
        alternative_language_codes: [
          "gu-IN",
          "hi-IN",
          "kn-IN",
          "ml-IN",
          "ta-IN",
          "te-IN",
        ],
      },
      content: base64Data,
    };

    const [response] = await getClient().recognize(request);

    if (!response?.results || response?.results.length === 0) {
      console.log('[Cloud STT V2] No results returned.');
      return '';
    }

    const transcription = response.results
      .map((result) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    // const [response] = await client.recognize({
    //   audio: { content: audioBuffer.toString('base64') },
    //   config: {
    //     encoding: encoding as any,
    //     sampleRateHertz,
    //     languageCode,
    //     enableAutomaticPunctuation: true,
    //     model: 'medical_dictation',
    //   },
    // });

    return transcription;
  } catch (err) {
    console.error(
      `[Cloud STT V2] Failed to transcribe using Cloud Speech V2. Falling back to GeminiTranscribe. Error: ${err.message || err}`,
    );
    throw err;
  }
}
