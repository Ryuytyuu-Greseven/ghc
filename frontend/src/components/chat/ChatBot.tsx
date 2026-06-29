import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Mic,
  MicOff,
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
import { useChatSession } from '../../hooks/useChatSession';
import { useTranslation } from 'react-i18next';

type Mode = 'text' | 'voice';
type VoiceState = 'connecting' | 'listening' | 'processing' | 'responding' | 'speaking' | 'error';
type Role = 'bot' | 'user';

interface Message {
  id: string;
  role: Role;
  content: string;
  time: string;
}

function getTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const BAR_DELAYS = [0, 100, 200, 80, 160, 40, 240];
const BAR_HEIGHTS_IDLE = ['15%', '25%', '18%', '30%', '20%', '28%', '15%'];
const CHAT_PANEL_HEIGHT = 'min(580px, calc(100dvh - 6.5rem))';
const CHAT_FOOTER_HEIGHT = 'h-[230px]';

function Bubble({ msg }: { msg: Message }) {
  const { t } = useTranslation();
  const isBot = msg.role === 'bot';
  return (
    <div className={clsx('flex gap-2 animate-fade-in', isBot ? 'flex-row' : 'flex-row-reverse')}>
      {isBot && (
        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Sparkles size={11} className="text-white" />
        </div>
      )}
      <div className={clsx('flex flex-col gap-0.5 max-w-[78%]', isBot ? 'items-start' : 'items-end')}>
        <div
          className={clsx(
            'px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl whitespace-pre-line',
            isBot
              ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200 border-l-[3px] border-l-emerald-500 shadow-sm'
              : 'bg-orange-500 text-white font-medium rounded-tr-none shadow-sm',
          )}
        >
          {msg.content === 'initMessage' ? t('chatbot.initMessage') : msg.content}
        </div>
        <span className="text-[10px] text-slate-400 px-0.5">{msg.time}</span>
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
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'bot',
      content: 'initMessage',
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUtteranceRef = useRef<string | null>(null);
  const lastResponseRef = useRef<string | null>(null);

  const chat = useChatSession({ enabled: isOpen, mode });

  const voiceState = deriveVoiceState(
    chat.connectionState,
    chat.micActive,
    chat.isProcessing,
    chat.agentText,
    chat.isPlaying,
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chat.agentText, chat.transcript]);

  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!chat.lastUserUtterance || chat.lastUserUtterance === lastUtteranceRef.current) return;
    lastUtteranceRef.current = chat.lastUserUtterance;
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: chat.lastUserUtterance!,
        time: getTime(),
      },
    ]);
  }, [chat.lastUserUtterance]);

  useEffect(() => {
    if (!chat.lastAgentResponse || chat.lastAgentResponse === lastResponseRef.current) return;
    lastResponseRef.current = chat.lastAgentResponse;
    setMessages(prev => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: chat.lastAgentResponse!,
        time: getTime(),
      },
    ]);
  }, [chat.lastAgentResponse]);

  const sendText = useCallback(() => {
    const text = input.trim();
    if (!text || chat.isProcessing || chat.connectionState !== 'connected') return;
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, time: getTime() }]);
    setInput('');
    chat.sendMessage(text);
  }, [input, chat]);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'voice') {
      chat.resumeAudioContext();
    }
  };

  const handleVoiceAction = () => {
    if (voiceState === 'speaking') {
      chat.stopAudio();
      return;
    }
    if (voiceState === 'listening' || voiceState === 'responding') {
      chat.resetSession();
      lastUtteranceRef.current = null;
      lastResponseRef.current = null;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const voiceLabel: Record<VoiceState, string> = {
    connecting: t('chatbot.connecting'),
    listening: t('chatbot.listening'),
    processing: t('chatbot.processing'),
    responding: t('chatbot.responding'),
    speaking: t('chatbot.speaking'),
    error: chat.error ?? t('chatbot.connectionError'),
  };

  const showLiveTranscript = mode === 'voice' && chat.transcript && voiceState !== 'speaking';
  const showLiveAgent =
    chat.agentText &&
    chat.isProcessing &&
    (mode === 'text' || voiceState === 'responding' || voiceState === 'processing');

  const connectionLabel =
    chat.connectionState === 'connected'
      ? `${mode === 'voice' ? t('chatbot.voice') : t('chatbot.text')} · ${chat.sessionId?.slice(0, 8) ?? 'live'}`
      : chat.connectionState === 'connecting'
        ? `${mode === 'voice' ? t('chatbot.voice') : t('chatbot.text')} · ${t('chatbot.connectingDot')}`
        : chat.connectionState === 'error'
          ? `${mode === 'voice' ? t('chatbot.voice') : t('chatbot.text')} · ${t('chatbot.error')}`
          : `${mode === 'voice' ? t('chatbot.voice') : t('chatbot.text')} · ${t('chatbot.offline')}`;

  const canSendText =
    input.trim().length > 0 &&
    !chat.isProcessing &&
    chat.connectionState === 'connected';

  return (
    <>
      {/* FAB trigger */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-orange-400 animate-bot-ping" />
            <span
              className="absolute inset-0 rounded-full bg-orange-400 animate-bot-ping"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}

        <button
          onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
          aria-label={isOpen ? t('common.cancel') : t('common.viewDetails')}
          className={clsx(
            'relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300',
            isOpen
              ? 'bg-white text-orange-500 shadow-slate-300/60 scale-95 ring-2 ring-orange-300'
              : 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-110 shadow-orange-400/40',
          )}
        >
          <div className={clsx('transition-all duration-200', isOpen ? 'rotate-90 scale-90' : 'rotate-0 scale-100')}>
            {isOpen ? <ChevronDown size={22} /> : <MessageSquare size={22} />}
          </div>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed bottom-[5.5rem] left-4 right-4 sm:left-auto sm:right-6 sm:w-[390px] z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-slate-400/20 animate-slide-up border border-slate-200"
          style={{ maxHeight: CHAT_PANEL_HEIGHT }}
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-300/40">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span
                  className={clsx(
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white',
                    chat.connectionState === 'connected' ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                />
              </div>
              <div>
                <p className="text-slate-800 font-semibold text-sm leading-tight">{t('chatbot.chatTitle')}</p>
                <p
                  className={clsx(
                    'text-xs',
                    chat.connectionState === 'connected' ? 'text-emerald-600' : 'text-slate-400',
                  )}
                >
                  {connectionLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-[3px] gap-[2px]">
                <button
                  onClick={() => switchMode('text')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
                    mode === 'text'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <MessageSquare size={11} />
                  {t('chatbot.text')}
                </button>
                <button
                  onClick={() => switchMode('voice')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150',
                    mode === 'voice'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <Mic size={11} />
                  {t('chatbot.voice')}
                </button>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3" style={{ minHeight: '280px' }}>
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} />
            ))}

            {showLiveTranscript && (
              <div className="flex gap-2 animate-fade-in opacity-70">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Mic size={11} className="text-orange-500" />
                </div>
                <div className="px-3.5 py-2 text-sm text-slate-500 italic border border-dashed border-slate-300 rounded-2xl rounded-tl-none bg-white">
                  {chat.transcript}
                </div>
              </div>
            )}

            {showLiveAgent && (
              <div className="flex gap-2 animate-fade-in">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Sparkles size={11} className="text-white" />
                </div>
                <div className="px-3.5 py-2.5 text-sm text-slate-800 bg-white rounded-2xl rounded-tl-none border border-slate-200 border-l-[3px] border-l-emerald-500 shadow-sm whitespace-pre-line">
                  {chat.agentText}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Voice footer */}
          {mode === 'voice' && (
            <div
              className={clsx(
                'bg-white border-t border-slate-100 px-5 flex flex-col items-center justify-center gap-4 shrink-0',
                CHAT_FOOTER_HEIGHT,
              )}
            >
              <div className="flex items-center justify-center gap-[4px] h-12 w-full">
                {voiceState === 'processing' || voiceState === 'connecting' ? (
                  Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] rounded-full bg-orange-200"
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
                            ? 'bg-orange-300 animate-voice-bar'
                            : 'bg-slate-200',
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
                            ? 'bg-orange-500 animate-voice-bar'
                            : voiceState === 'speaking'
                              ? 'bg-emerald-500 animate-voice-bar'
                              : voiceState === 'responding'
                                ? 'bg-orange-400 animate-voice-bar'
                                : 'bg-slate-300',
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
                            ? 'bg-orange-300 animate-voice-bar'
                            : 'bg-slate-200',
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
                  voiceState === 'error'
                    ? 'text-red-500'
                    : voiceState === 'connecting'
                      ? 'text-slate-400'
                      : voiceState === 'speaking'
                        ? 'text-emerald-600'
                        : 'text-orange-600',
                )}
              >
                {voiceState === 'listening' && <span className="mr-1.5 text-orange-500">●</span>}
                {voiceLabel[voiceState]}
              </p>

              <div className="flex items-center gap-4">
                {/* Mute toggle */}
                <button
                  onClick={chat.toggleMute}
                  disabled={voiceState === 'connecting' || voiceState === 'error'}
                  aria-label={chat.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={clsx(
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2 shadow-sm',
                    chat.isMuted
                      ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-400 hover:bg-emerald-100',
                    (voiceState === 'connecting' || voiceState === 'error') && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {chat.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Main action */}
                <button
                  onClick={handleVoiceAction}
                  disabled={voiceState === 'processing' || voiceState === 'connecting' || voiceState === 'error'}
                  className={clsx(
                    'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-md',
                    voiceState === 'speaking' &&
                      'bg-emerald-50 text-emerald-600 border-2 border-emerald-400 hover:bg-emerald-100',
                    voiceState === 'listening' &&
                      'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105 shadow-orange-300/50',
                    voiceState === 'responding' &&
                      'bg-slate-100 text-orange-500 border border-orange-200 hover:bg-slate-200',
                    (voiceState === 'processing' || voiceState === 'connecting') &&
                      'bg-slate-100 text-slate-300 cursor-not-allowed',
                    voiceState === 'error' && 'bg-red-50 text-red-400 cursor-not-allowed border border-red-200',
                  )}
                >
                  {voiceState === 'speaking' && <Square size={20} />}
                  {voiceState === 'listening' && <RotateCcw size={22} />}
                  {voiceState === 'responding' && <RotateCcw size={20} />}
                  {(voiceState === 'processing' || voiceState === 'connecting') && (
                    <Loader2 size={22} className="animate-spin text-orange-300" />
                  )}
                  {voiceState === 'error' && <WifiOff size={22} />}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                {voiceState === 'speaking'
                  ? t('chatbot.tapToStop')
                  : voiceState === 'listening'
                    ? t('chatbot.micIsOpen')
                    : voiceState === 'responding'
                      ? t('chatbot.tapToReset')
                      : '\u00a0'}
              </p>
            </div>
          )}

          {/* Text footer */}
          {mode === 'text' && (
            <div className="bg-white border-t border-slate-100 px-3 py-3 flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center gap-2">
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
                  placeholder={t('chatbot.placeholder')}
                  disabled={chat.connectionState !== 'connected'}
                  className="flex-1 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={sendText}
                  disabled={!canSendText}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm shadow-orange-300/40"
                >
                  <Send size={16} />
                </button>
              </div>

              {chat.isProcessing && (
                <p className="text-[10px] text-orange-500 flex items-center justify-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> {t('chatbot.responding')}
                </p>
              )}
            </div>
          )}

          {/* Status bar */}
          <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              {chat.connectionState === 'connected' ? (
                <Wifi size={10} className="text-emerald-500" />
              ) : (
                <WifiOff size={10} className="text-slate-400" />
              )}
              <span
                className={clsx(
                  'text-[10px] font-medium',
                  chat.connectionState === 'connected' ? 'text-emerald-600' : 'text-slate-400',
                )}
              >
                {connectionLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{t('chatbot.healthAI')}</span>
          </div>
        </div>
      )}
    </>
  );
}
