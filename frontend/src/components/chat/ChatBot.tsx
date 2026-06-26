import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Mic,
  Send,
  Square,
  Sparkles,
  Loader2,
  ChevronDown,
  Wifi,
  WifiOff,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useVoiceSession } from '../../hooks/useVoiceSession';

type Mode = 'text' | 'voice';
type VoiceState = 'connecting' | 'listening' | 'processing' | 'responding' | 'speaking' | 'error';
type Role = 'bot' | 'user';

interface Message {
  id: string;
  role: Role;
  content: string;
  time: string;
}

const BOT_RESPONSES = [
  'I can help you check bed availability, staff assignments, patient status, and medicine inventory across all GHC facilities.',
  'GHC City Hospital currently has the highest bed availability at 68%. Would you like the full breakdown?',
  'The staff assignment rate across all facilities is 78%. There are 3 doctors currently unassigned.',
  'Paracetamol 500mg stock is critically low — central storage has less than 15% remaining. Immediate restocking is recommended.',
  'There are 42 active patients across all facilities, 14 of whom require bed assignments.',
  'I found 5 facilities in your network. 2 hospitals and 3 clinics. Would you like details on a specific one?',
];
let responseCursor = 0;

function nextBotResponse(): string {
  return BOT_RESPONSES[responseCursor++ % BOT_RESPONSES.length];
}

function getTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const BAR_DELAYS = [0, 100, 200, 80, 160, 40, 240];
const BAR_HEIGHTS_IDLE = ['15%', '25%', '18%', '30%', '20%', '28%', '15%'];

function TypingIndicator() {
  return (
    <div className="flex gap-2 animate-fade-in">
      <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={11} className="text-black" />
      </div>
      <div className="bg-zinc-800 border border-zinc-700/50 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-typing-dot"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isBot = msg.role === 'bot';
  return (
    <div className={clsx('flex gap-2 animate-fade-in', isBot ? 'flex-row' : 'flex-row-reverse')}>
      {isBot && (
        <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={11} className="text-black" />
        </div>
      )}
      <div className={clsx('flex flex-col gap-0.5 max-w-[78%]', isBot ? 'items-start' : 'items-end')}>
        <div
          className={clsx(
            'px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl',
            isBot
              ? 'bg-zinc-800 text-zinc-100 rounded-tl-none border-l-[2px] border-yellow-500/50'
              : 'bg-yellow-400 text-black font-medium rounded-tr-none',
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-zinc-600 px-0.5">{msg.time}</span>
      </div>
    </div>
  );
}

function deriveVoiceState(
  connectionState: string,
  micActive: boolean,
  isProcessing: boolean,
  agentText: string,
  isPlaying: boolean,
): VoiceState {
  if (connectionState === 'connecting') return 'connecting';
  if (connectionState === 'error') return 'error';
  if (isPlaying) return 'speaking';
  if (isProcessing && agentText) return 'responding';
  if (isProcessing) return 'processing';
  if (micActive) return 'listening';
  return 'connecting';
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'bot',
      content:
        "Hi! I'm GHC Health Assistant. I can help with bed availability, staff assignments, patient data, and medicine inventory. Type a message or switch to voice mode.",
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUtteranceRef = useRef<string | null>(null);
  const lastResponseRef = useRef<string | null>(null);

  const voiceEnabled = isOpen && mode === 'voice';
  const voice = useVoiceSession(voiceEnabled);

  const voiceState = deriveVoiceState(
    voice.connectionState,
    voice.micActive,
    voice.isProcessing,
    voice.agentText,
    voice.isPlaying,
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, voice.agentText, voice.transcript]);

  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, mode]);

  useEffect(() => () => {
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
  }, []);

  useEffect(() => {
    if (!voice.lastUserUtterance || voice.lastUserUtterance === lastUtteranceRef.current) return;
    lastUtteranceRef.current = voice.lastUserUtterance;
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: voice.lastUserUtterance!,
        time: getTime(),
      },
    ]);
  }, [voice.lastUserUtterance]);

  useEffect(() => {
    if (!voice.lastAgentResponse || voice.lastAgentResponse === lastResponseRef.current) return;
    lastResponseRef.current = voice.lastAgentResponse;
    setMessages(prev => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: voice.lastAgentResponse!,
        time: getTime(),
      },
    ]);
  }, [voice.lastAgentResponse]);

  const appendBotReply = useCallback((content: string) => {
    setMessages(prev => [...prev, { id: `bot-${Date.now()}`, role: 'bot', content, time: getTime() }]);
  }, []);

  const sendText = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, time: getTime() }]);
    setInput('');
    setIsTyping(true);
    textTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      appendBotReply(nextBotResponse());
    }, 1000 + Math.random() * 700);
  }, [input, appendBotReply]);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
    setIsTyping(false);
    if (m === 'voice') {
      voice.resumeAudioContext();
    }
  };

  const handleVoiceAction = () => {
    if (voiceState === 'speaking') {
      voice.stopAudio();
      return;
    }
    if (voiceState === 'listening' || voiceState === 'responding') {
      voice.resetSession();
      lastUtteranceRef.current = null;
      lastResponseRef.current = null;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (textTimerRef.current) clearTimeout(textTimerRef.current);
    setIsTyping(false);
  };

  const voiceLabel: Record<VoiceState, string> = {
    connecting: 'Connecting to voice server…',
    listening: 'Listening — speak naturally',
    processing: 'Processing your voice…',
    responding: 'Generating response…',
    speaking: 'Playing response — tap to stop',
    error: voice.error ?? 'Connection error',
  };

  const showLiveTranscript = voice.transcript && voiceState !== 'speaking';
  const showLiveAgent = voice.agentText && (voiceState === 'responding' || voiceState === 'processing');

  const connectionLabel =
    voice.connectionState === 'connected'
      ? `Voice · ${voice.sessionId?.slice(0, 8) ?? 'live'}`
      : voice.connectionState === 'connecting'
        ? 'Voice · Connecting…'
        : voice.connectionState === 'error'
          ? 'Voice · Error'
          : 'Voice · Offline';

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-yellow-400 animate-bot-ping" />
            <span
              className="absolute inset-0 rounded-full bg-yellow-400 animate-bot-ping"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}

        <button
          onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
          className={clsx(
            'relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300',
            isOpen
              ? 'bg-zinc-900 text-yellow-400 shadow-zinc-900/50 scale-95 ring-2 ring-yellow-400/30'
              : 'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-110 shadow-yellow-400/30',
          )}
        >
          <div className={clsx('transition-all duration-200', isOpen ? 'rotate-90 scale-90' : 'rotate-0 scale-100')}>
            {isOpen ? <ChevronDown size={22} /> : <MessageSquare size={22} />}
          </div>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed bottom-[5.5rem] left-4 right-4 sm:left-auto sm:right-6 sm:w-[390px] z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/40 animate-slide-up border border-yellow-500/10"
          style={{ maxHeight: 'min(580px, calc(100dvh - 6.5rem))' }}
        >
          <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center shadow-md shadow-yellow-400/20">
                  <Sparkles size={16} className="text-black" />
                </div>
                <span
                  className={clsx(
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950',
                    voice.connectionState === 'connected' && mode === 'voice'
                      ? 'bg-emerald-400'
                      : 'bg-emerald-400',
                  )}
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">GHC Assistant</p>
                <p className="text-yellow-500/60 text-xs">
                  {mode === 'voice' ? connectionLabel : 'AI Health · Online'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-900 rounded-lg p-[3px] gap-[2px]">
                <button
                  onClick={() => switchMode('text')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
                    mode === 'text'
                      ? 'bg-yellow-400 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  <MessageSquare size={11} />
                  Text
                </button>
                <button
                  onClick={() => switchMode('voice')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
                    mode === 'voice'
                      ? 'bg-yellow-400 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  <Mic size={11} />
                  Voice
                </button>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-zinc-950 px-4 py-4 space-y-3 min-h-0">
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} />
            ))}

            {mode === 'voice' && showLiveTranscript && (
              <div className="flex gap-2 animate-fade-in opacity-70">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Mic size={11} className="text-yellow-400" />
                </div>
                <div className="px-3.5 py-2 text-sm text-zinc-400 italic border border-dashed border-zinc-700 rounded-2xl rounded-tl-none">
                  {voice.transcript}
                </div>
              </div>
            )}

            {mode === 'voice' && showLiveAgent && (
              <div className="flex gap-2 animate-fade-in">
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={11} className="text-black" />
                </div>
                <div className="px-3.5 py-2.5 text-sm text-zinc-100 bg-zinc-800 rounded-2xl rounded-tl-none border-l-[2px] border-yellow-500/50">
                  {voice.agentText}
                </div>
              </div>
            )}

            {isTyping && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          {mode === 'voice' && (
            <div className="bg-zinc-950 border-t border-zinc-800/80 px-5 py-5 flex flex-col items-center gap-4 shrink-0">
              <div className="flex items-center justify-center gap-[4px] h-12 w-full">
                {voiceState === 'processing' || voiceState === 'connecting' ? (
                  Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] rounded-full bg-yellow-400/30"
                      style={{ height: `${20 + Math.sin(i * 0.7) * 40}%` }}
                    />
                  ))
                ) : (
                  <>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`l${i}`}
                        className={clsx(
                          'w-[2px] rounded-full transition-all',
                          voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'responding'
                            ? 'bg-yellow-400/40 animate-voice-bar'
                            : 'bg-zinc-800',
                        )}
                        style={{
                          animationDelay: `${i * 55}ms`,
                          height:
                            voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'responding'
                              ? undefined
                              : `${10 + i * 5}%`,
                        }}
                      />
                    ))}
                    {BAR_DELAYS.map((delay, i) => (
                      <div
                        key={`m${i}`}
                        className={clsx(
                          'w-[3px] rounded-full transition-all',
                          voiceState === 'listening'
                            ? 'bg-yellow-400 animate-voice-bar'
                            : voiceState === 'speaking'
                              ? 'bg-yellow-300 animate-voice-bar'
                              : voiceState === 'responding'
                                ? 'bg-yellow-400/70 animate-voice-bar'
                                : 'bg-zinc-700',
                        )}
                        style={{
                          animationDelay: `${delay}ms`,
                          height:
                            voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'responding'
                              ? undefined
                              : BAR_HEIGHTS_IDLE[i],
                        }}
                      />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`r${i}`}
                        className={clsx(
                          'w-[2px] rounded-full transition-all',
                          voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'responding'
                            ? 'bg-yellow-400/40 animate-voice-bar'
                            : 'bg-zinc-800',
                        )}
                        style={{
                          animationDelay: `${(7 - i) * 55}ms`,
                          height:
                            voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'responding'
                              ? undefined
                              : `${10 + (7 - i) * 5}%`,
                        }}
                      />
                    ))}
                  </>
                )}
              </div>

              <p
                className={clsx(
                  'text-xs font-medium tracking-wide transition-colors text-center',
                  voiceState === 'error' ? 'text-red-400' : voiceState === 'connecting' ? 'text-zinc-500' : 'text-yellow-400',
                )}
              >
                {voiceState === 'listening' && <span className="mr-1.5">●</span>}
                {voiceLabel[voiceState]}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleVoiceAction}
                  disabled={voiceState === 'processing' || voiceState === 'connecting' || voiceState === 'error'}
                  className={clsx(
                    'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                    voiceState === 'speaking' &&
                      'bg-yellow-400/20 text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400/30',
                    voiceState === 'listening' &&
                      'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-105 shadow-yellow-400/30',
                    voiceState === 'responding' &&
                      'bg-zinc-800 text-yellow-400 border border-yellow-400/30 hover:bg-zinc-700',
                    (voiceState === 'processing' || voiceState === 'connecting') &&
                      'bg-zinc-800 text-zinc-500 cursor-not-allowed',
                    voiceState === 'error' && 'bg-zinc-800 text-red-400 cursor-not-allowed',
                  )}
                >
                  {voiceState === 'speaking' && <Square size={20} />}
                  {voiceState === 'listening' && <RotateCcw size={22} />}
                  {voiceState === 'responding' && <RotateCcw size={20} />}
                  {(voiceState === 'processing' || voiceState === 'connecting') && (
                    <Loader2 size={22} className="animate-spin text-yellow-400/60" />
                  )}
                  {voiceState === 'error' && <WifiOff size={22} />}
                </button>
              </div>

              <p className="text-[10px] text-zinc-700 text-center">
                {voiceState === 'speaking'
                  ? 'Tap to stop playback'
                  : voiceState === 'listening'
                    ? 'Mic is open — tap to reset conversation'
                    : voiceState === 'responding'
                      ? 'Tap to reset conversation'
                      : '\u00a0'}
              </p>
            </div>
          )}

          {mode === 'text' && (
            <div className="bg-zinc-950 border-t border-zinc-800/80 px-3 py-3 flex items-center gap-2 shrink-0">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendText();
                    }
                  }}
                  placeholder="Ask about beds, staff, medicines…"
                  className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-600 border border-zinc-700/70 rounded-xl px-4 py-2.5 pr-2 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition"
                />
              </div>
              <button
                onClick={sendText}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-md shadow-yellow-400/20"
              >
                <Send size={16} />
              </button>
            </div>
          )}

          <div className="bg-zinc-950 border-t border-zinc-900 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              {mode === 'voice' && voice.connectionState === 'connected' ? (
                <Wifi size={10} className="text-emerald-500" />
              ) : mode === 'voice' ? (
                <WifiOff size={10} className="text-zinc-600" />
              ) : (
                <Wifi size={10} className="text-zinc-700" />
              )}
              <span className="text-[10px] text-zinc-700 font-medium">
                {mode === 'voice' ? connectionLabel : 'Text · Local demo'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-700">GHC Health AI</span>
          </div>
        </div>
      )}
    </>
  );
}
