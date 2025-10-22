import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type AnnouncerContextType = {
  announce: (message: string, mode?: 'polite' | 'assertive') => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  useTTS: boolean;
  setUseTTS: (v: boolean) => void;
};

const AnnouncerContext = createContext<AnnouncerContextType>({
  announce: () => {},
  enabled: true,
  setEnabled: () => {},
  useTTS: false,
  setUseTTS: () => {},
});

export const useAnnouncer = () => useContext(AnnouncerContext);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('a11y:screenReaderEnabled');
      if (raw === null) return true; // enabled by default
      return raw === 'true';
    } catch {
      return true;
    }
  });

  const [message, setMessage] = useState<string>('');
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');
  const [useTTS, setUseTTSState] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('a11y:useTTS');
      return raw === 'true';
    } catch {
      return false;
    }
  });

  // Keep a ref to the last utterance so we can cancel/resume if needed
  const lastUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  // Track the last announced message/time to prevent rapid repeats
  const lastAnnouncedRef = React.useRef<{ msg: string; t: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('a11y:screenReaderEnabled', String(enabled));
    } catch (_) {}
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem('a11y:useTTS', String(useTTS));
    } catch (_) {}
  }, [useTTS]);

  const announce = React.useCallback((msg: string, m: 'polite' | 'assertive' = 'polite') => {
    // If neither live regions nor TTS are enabled, skip work
    if (!enabled && !useTTS) return;

    // Prevent very rapid repeats of the exact same message (debounce window)
    try {
      const now = Date.now();
      const last = lastAnnouncedRef.current;
      if (last && last.msg === msg && now - last.t < 1000) {
        return;
      }
      lastAnnouncedRef.current = { msg, t: now };
    } catch (_) {}

    try {
      if (m === 'assertive') {
        // quick reset to ensure updates are noticed by SRs
        setAssertiveMessage('');
        setTimeout(() => setAssertiveMessage(msg), 50);
      } else {
        setPoliteMessage('');
        setTimeout(() => setPoliteMessage(msg), 50);
      }

      // If TTS is enabled, speak the message using the Web Speech API
      if (useTTS && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const synth = window.speechSynthesis as SpeechSynthesis;
          // Cancel any ongoing TTS for assertive messages
          if (m === 'assertive') synth.cancel();
          const utter = new SpeechSynthesisUtterance(msg);
          utter.lang = (navigator as any).language || 'en-US';
          utter.rate = 1;
          // Store reference so we can cancel later if needed
          lastUtteranceRef.current = utter;
          synth.speak(utter);
        } catch (ttsErr) {
          // ignore tts errors
          console.warn('TTS announce failed', ttsErr);
        }
      }
    } catch (e) {
      // swallow errors to avoid breaking UI
      console.warn('Announce failed', e);
    }
  }, [enabled, useTTS]);

  const setEnabled = (v: boolean) => setEnabledState(v);
  const setUseTTS = (v: boolean) => setUseTTSState(v);

  const contextValue = React.useMemo(() => ({ announce, enabled, setEnabled, useTTS, setUseTTS }), [announce, enabled, setEnabled, useTTS, setUseTTS]);

  return (
    <AnnouncerContext.Provider value={contextValue}>
      {children}
      {/* Two off-screen live regions for reliability: polite and assertive */}
      <div className="sr-only">
        <div aria-live="polite" aria-atomic="true">{politeMessage}</div>
        <div aria-live="assertive" aria-atomic="true">{assertiveMessage}</div>
      </div>
    </AnnouncerContext.Provider>
  );
}

export default AnnouncerProvider;
