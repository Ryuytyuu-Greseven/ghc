import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Mic,
  Send,
  Square,
  Sparkles,
  Volume2,
  Loader2,
  ChevronDown,
  Wifi,
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'text' | 'voice';
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
type Role = 'bot' | 'user';

interface Message {
  id: string;
  role: Role;
  content: string;
  time: string;
}

// ─── Mock bot responses (WebSocket will replace these) ────────────────────────

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

// ─── Voice waveform bars ──────────────────────────────────────────────────────

const BAR_DELAYS = [0, 100, 200, 80, 160, 40, 240];
const BAR_HEIGHTS_IDLE = ['15%', '25%', '18%', '30%', '20%', '28%', '15%'];

// ─── Typing indicator ─────────────────────────────────────────────────────────

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

// ─── Single message bubble ────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isBot = msg.role === 'bot';
  return (
    <div
      className={clsx(
        'flex gap-2 animate-fade-in',
        isBot ? 'flex-row' : 'flex-row-reverse'
      )}
    >
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
              : 'bg-yellow-400 text-black font-medium rounded-tr-none'
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-zinc-600 px-0.5">{msg.time}</span>
      </div>
    </div>
  );
}

// ─── Main ChatBot component ───────────────────────────────────────────────────

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
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-focus input when opening in text mode
  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, mode]);

  // Clean up voice timer on unmount
  useEffect(() => () => { if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current); }, []);

  const appendBotReply = useCallback((content: string) => {
    setMessages(prev => [...prev, { id: `bot-${Date.now()}`, role: 'bot', content, time: getTime() }]);
  }, []);

  // ── Text send ──
  const sendText = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, time: getTime() }]);
    setInput('');
    setIsTyping(true);
    // Stub: WebSocket will replace this timeout
    voiceTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      appendBotReply(nextBotResponse());
    }, 1000 + Math.random() * 700);
  }, [input, appendBotReply]);

  // ── Voice flow (stub — WebSocket will stream audio) ──
  const handleVoiceTap = useCallback(() => {
    if (voiceState === 'processing') return;

    if (voiceState === 'listening') {
      // Stop recording early
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
      setVoiceState('processing');
      voiceTimerRef.current = setTimeout(() => {
        const transcribed = 'What is the current bed availability?';
        setMessages(prev => [
          ...prev,
          { id: `user-${Date.now()}`, role: 'user', content: transcribed, time: getTime() },
        ]);
        setVoiceState('speaking');
        voiceTimerRef.current = setTimeout(() => {
          appendBotReply(nextBotResponse());
          setVoiceState('idle');
        }, 2200);
      }, 900);
      return;
    }

    if (voiceState === 'speaking') {
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
      setVoiceState('idle');
      return;
    }

    // Start recording
    setVoiceState('listening');
    // Auto-stop after 5s to simulate recording limit
    voiceTimerRef.current = setTimeout(() => {
      setVoiceState('processing');
      voiceTimerRef.current = setTimeout(() => {
        const transcribed = 'What is the current bed availability?';
        setMessages(prev => [
          ...prev,
          { id: `user-${Date.now()}`, role: 'user', content: transcribed, time: getTime() },
        ]);
        setVoiceState('speaking');
        voiceTimerRef.current = setTimeout(() => {
          appendBotReply(nextBotResponse());
          setVoiceState('idle');
        }, 2200);
      }, 1000);
    }, 5000);
  }, [voiceState, appendBotReply]);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    setVoiceState('idle');
    setIsTyping(false);
  };

  const voiceLabel = {
    idle: 'Tap mic to start speaking',
    listening: 'Listening — tap to stop',
    processing: 'Processing your voice...',
    speaking: 'Playing response — tap to stop',
  }[voiceState];

  return (
    <>
      {/* ── Floating action button ─────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Pulse rings */}
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
          onClick={() => setIsOpen(o => !o)}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
          className={clsx(
            'relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300',
            isOpen
              ? 'bg-zinc-900 text-yellow-400 shadow-zinc-900/50 scale-95 ring-2 ring-yellow-400/30'
              : 'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-110 shadow-yellow-400/30'
          )}
        >
          <div className={clsx('transition-all duration-200', isOpen ? 'rotate-90 scale-90' : 'rotate-0 scale-100')}>
            {isOpen ? <ChevronDown size={22} /> : <MessageSquare size={22} />}
          </div>
        </button>
      </div>

      {/* ── Chat panel ────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-[5.5rem] left-4 right-4 sm:left-auto sm:right-6 sm:w-[390px] z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/40 animate-slide-up border border-yellow-500/10"
          style={{ maxHeight: 'min(580px, calc(100dvh - 6.5rem))' }}
        >
          {/* Header */}
          <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* Bot avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center shadow-md shadow-yellow-400/20">
                  <Sparkles size={16} className="text-black" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-zinc-950" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">GHC Assistant</p>
                <p className="text-yellow-500/60 text-xs">AI Health · Online</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Text / Voice toggle */}
              <div className="flex items-center bg-zinc-900 rounded-lg p-[3px] gap-[2px]">
                <button
                  onClick={() => switchMode('text')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
                    mode === 'text'
                      ? 'bg-yellow-400 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
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
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  <Mic size={11} />
                  Voice
                </button>
              </div>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto bg-zinc-950 px-4 py-4 space-y-3 min-h-0">
            {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
            {isTyping && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          {/* ── Voice mode panel ───────────────────────────────────── */}
          {mode === 'voice' && (
            <div className="bg-zinc-950 border-t border-zinc-800/80 px-5 py-5 flex flex-col items-center gap-4 shrink-0">

              {/* Waveform visualiser */}
              <div className="flex items-center justify-center gap-[4px] h-12 w-full">
                {voiceState === 'processing' ? (
                  /* Equaliser-style placeholder bars */
                  Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] rounded-full bg-yellow-400/30"
                      style={{ height: `${20 + Math.sin(i * 0.7) * 40}%` }}
                    />
                  ))
                ) : (
                  <>
                    {/* Left padding bars */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`l${i}`}
                        className={clsx(
                          'w-[2px] rounded-full transition-all',
                          voiceState === 'listening' || voiceState === 'speaking'
                            ? 'bg-yellow-400/40 animate-voice-bar'
                            : 'bg-zinc-800'
                        )}
                        style={{
                          animationDelay: `${i * 55}ms`,
                          height:
                            voiceState === 'listening' || voiceState === 'speaking'
                              ? undefined
                              : `${10 + i * 5}%`,
                        }}
                      />
                    ))}
                    {/* Centre main bars */}
                    {BAR_DELAYS.map((delay, i) => (
                      <div
                        key={`m${i}`}
                        className={clsx(
                          'w-[3px] rounded-full transition-all',
                          voiceState === 'listening'
                            ? 'bg-yellow-400 animate-voice-bar'
                            : voiceState === 'speaking'
                            ? 'bg-yellow-300 animate-voice-bar'
                            : 'bg-zinc-700'
                        )}
                        style={{
                          animationDelay: `${delay}ms`,
                          height:
                            voiceState === 'listening' || voiceState === 'speaking'
                              ? undefined
                              : BAR_HEIGHTS_IDLE[i],
                        }}
                      />
                    ))}
                    {/* Right padding bars */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`r${i}`}
                        className={clsx(
                          'w-[2px] rounded-full transition-all',
                          voiceState === 'listening' || voiceState === 'speaking'
                            ? 'bg-yellow-400/40 animate-voice-bar'
                            : 'bg-zinc-800'
                        )}
                        style={{
                          animationDelay: `${(7 - i) * 55}ms`,
                          height:
                            voiceState === 'listening' || voiceState === 'speaking'
                              ? undefined
                              : `${10 + (7 - i) * 5}%`,
                        }}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Status label */}
              <p
                className={clsx(
                  'text-xs font-medium tracking-wide transition-colors',
                  voiceState === 'idle' ? 'text-zinc-500' : 'text-yellow-400'
                )}
              >
                {voiceState === 'listening' && <span className="mr-1.5">●</span>}
                {voiceLabel}
              </p>

              {/* Main mic/action button */}
              <button
                onClick={handleVoiceTap}
                disabled={voiceState === 'processing'}
                className={clsx(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                  voiceState === 'idle' &&
                    'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-105 shadow-yellow-400/30',
                  voiceState === 'listening' &&
                    'bg-red-500 text-white animate-pulse shadow-red-500/30',
                  voiceState === 'processing' &&
                    'bg-zinc-800 text-zinc-500 cursor-not-allowed',
                  voiceState === 'speaking' &&
                    'bg-yellow-400/20 text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400/30'
                )}
              >
                {voiceState === 'idle' && <Mic size={26} />}
                {voiceState === 'listening' && <Square size={20} />}
                {voiceState === 'processing' && (
                  <Loader2 size={22} className="animate-spin text-yellow-400/60" />
                )}
                {voiceState === 'speaking' && <Volume2 size={22} />}
              </button>

              {/* Shortcut hint */}
              <p className="text-[10px] text-zinc-700">
                {voiceState === 'idle' ? 'Press and hold to record' : voiceState === 'listening' ? 'Release or tap to stop' : ' '}
              </p>
            </div>
          )}

          {/* ── Text input bar ─────────────────────────────────────── */}
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

          {/* Footer status bar */}
          <div className="bg-zinc-950 border-t border-zinc-900 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Wifi size={10} className="text-zinc-700" />
              <span className="text-[10px] text-zinc-700 font-medium">
                WebSocket · Pending integration
              </span>
            </div>
            <span className="text-[10px] text-zinc-700">GHC Health AI</span>
          </div>
        </div>
      )}
    </>
  );
}
