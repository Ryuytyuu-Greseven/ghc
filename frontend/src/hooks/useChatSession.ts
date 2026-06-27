import { useState, useRef, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export type ChatConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ChatMode = 'text' | 'voice';

function toArrayBuffer(chunk: unknown): ArrayBuffer {
  if (chunk instanceof ArrayBuffer) return chunk;
  if (ArrayBuffer.isView(chunk)) {
    const view = chunk as ArrayBufferView;
    const copy = new Uint8Array(view.byteLength);
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return copy.buffer;
  }
  return (chunk as { buffer: ArrayBuffer }).buffer;
}

export function useChatSession({
  enabled,
  mode,
}: {
  enabled: boolean;
  mode: ChatMode;
}) {
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentText, setAgentText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserUtterance, setLastUserUtterance] = useState<string | null>(null);
  const [lastAgentResponse, setLastAgentResponse] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const modeRef = useRef(mode);
  const muteRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);
  const agentTextRef = useRef('');

  modeRef.current = mode;

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    const source = activeSourceRef.current;
    if (source) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
      activeSourceRef.current = null;
    }
    pendingChunksRef.current = [];
    setIsPlaying(false);
  }, []);

  const playAudioBuffer = useCallback(
    (audioBuffer: AudioBuffer) => {
      stopAudio();
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      activeSourceRef.current = source;
      setIsPlaying(true);
      source.onended = () => {
        activeSourceRef.current = null;
        setIsPlaying(false);
      };
    },
    [getAudioContext, stopAudio],
  );

  const stopMic = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    setMicActive(false);
  }, []);

  const attachRecorder = useCallback((recorder: MediaRecorder, socket: Socket) => {
    recorder.ondataavailable = event => {
      if (event.data.size > 0 && socket.connected && !muteRef.current) {
        event.data.arrayBuffer().then(buffer => {
          socket.emit('audio:chunk', buffer);
        });
      }
    };
  }, []);

  const startRecorderOnStream = useCallback(
    (socket: Socket) => {
      const stream = mediaStreamRef.current;
      if (!stream || modeRef.current !== 'voice') return false;

      const trackLive = stream.getAudioTracks().some(t => t.readyState === 'live');
      if (!trackLive) return false;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      attachRecorder(recorder, socket);
      recorder.start(250);
      return true;
    },
    [attachRecorder],
  );

  const startMic = useCallback(async (socket: Socket) => {
    if (modeRef.current !== 'voice') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      attachRecorder(recorder, socket);

      socket.emit('audio:stream-start', {}, () => {
        if (recorder.state === 'inactive') {
          recorder.start(250);
        }
      });
      setMicActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone access denied';
      setError(message);
      setConnectionState('error');
    }
  }, [attachRecorder]);

  const restartRecorder = useCallback(
    async (socket: Socket) => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;

      const started = startRecorderOnStream(socket);
      if (started) return;

      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      await startMic(socket);
    },
    [startRecorderOnStream, startMic],
  );

  const endSession = useCallback(() => {
    stopAudio();
    stopMic();
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState('disconnected');
    setSessionId(null);
    setTranscript('');
    setAgentText('');
    agentTextRef.current = '';
    setIsProcessing(false);
    setMicActive(false);
    setIsPlaying(false);
  }, [stopAudio, stopMic]);

  const resetSession = useCallback(() => {
    socketRef.current?.emit('session:reset');
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current?.connected) return;

    setIsProcessing(true);
    setAgentText('');
    agentTextRef.current = '';
    socketRef.current.emit('message:send', { text: trimmed });
  }, []);

  const resumeAudioContext = useCallback(async () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, [getAudioContext]);

  const toggleMute = useCallback(() => {
    const socket = socketRef.current;
    const nextMuted = !muteRef.current;
    muteRef.current = nextMuted;
    setIsMuted(nextMuted);

    if (!socket?.connected) return;

    if (nextMuted) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      socket.emit('audio:stream-end');
      return;
    }

    socket.emit('audio:stream-start', {}, () => {
      void restartRecorder(socket);
    });
  }, [restartRecorder]);

  useEffect(() => {
    if (!enabled) {
      endSession();
      return;
    }

    setConnectionState('connecting');
    setError(null);

    const token = localStorage.getItem('ghc_auth_token');
    const namespace = mode === 'voice' ? 'voice' : 'chat';
    const socket = io(`${BACKEND_URL}/${namespace}`, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('session:ready', ({ sessionId: id }: { sessionId: string }) => {
      setSessionId(id);
      setConnectionState('connected');
      if (modeRef.current === 'voice') {
        startMic(socket);
      }
    });

    socket.on('transcript:partial', ({ text }: { text: string }) => {
      setTranscript(text);
    });

    socket.on('transcript:final', ({ text }: { text: string }) => {
      setTranscript(text);
      setLastUserUtterance(text);
      setIsProcessing(true);
      setAgentText('');
      agentTextRef.current = '';
    });

    socket.on('agent:chunk', ({ text }: { text: string }) => {
      agentTextRef.current += text;
      setAgentText(agentTextRef.current);
    });

    socket.on('agent:done', ({ text }: { text: string }) => {
      setAgentText(text);
      setLastAgentResponse(text);
      setIsProcessing(false);
    });

    socket.on('agent:preempted', () => {
      stopAudio();
      pendingChunksRef.current = [];
      setAgentText('');
      agentTextRef.current = '';
      setIsProcessing(true);
    });

    socket.on('audio:response', (chunk: unknown) => {
      pendingChunksRef.current.push(toArrayBuffer(chunk));
    });

    socket.on('audio:done', async () => {
      const chunks = pendingChunksRef.current;
      if (chunks.length === 0) return;

      pendingChunksRef.current = [];

      const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const audioBuffer = await ctx.decodeAudioData(merged.buffer.slice(0));
        playAudioBuffer(audioBuffer);
      } catch (err) {
        console.error('Audio decode error:', err);
        setError('Failed to play audio response');
      }
    });

    socket.on('session:reset', () => {
      setTranscript('');
      setAgentText('');
      agentTextRef.current = '';
      stopAudio();
      setIsProcessing(false);
    });

    socket.on('error', ({ message }: { message: string }) => {
      setIsProcessing(false);
      setError(message);
    });

    socket.on('connect_error', () => {
      setConnectionState('error');
      setError('Failed to connect to chat server');
    });

    socket.on('disconnect', () => {
      setMicActive(false);
      if (enabled) {
        setConnectionState('disconnected');
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      stopAudio();
      stopMic();
      socketRef.current = null;
    };
  }, [enabled, startMic, stopAudio, stopMic, getAudioContext, playAudioBuffer, endSession]);

  useEffect(() => {
    if (!enabled || connectionState !== 'connected' || !socketRef.current) return;

    if (mode === 'voice') {
      resumeAudioContext();
      if (!micActive) {
        startMic(socketRef.current);
      }
    } else {
      stopMic();
    }
  }, [enabled, mode, connectionState, micActive, startMic, stopMic, resumeAudioContext]);

  return {
    connectionState,
    sessionId,
    micActive,
    isMuted,
    isProcessing,
    transcript,
    agentText,
    isPlaying,
    error,
    lastUserUtterance,
    lastAgentResponse,
    sendMessage,
    stopAudio,
    resetSession,
    resumeAudioContext,
    toggleMute,
    endSession,
  };
}
