
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxRecordingTime?: number; // in seconds
}

interface Transcript {
  interim: string;
  final: string;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    maxRecordingTime = 120, // 2 minutes
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [transcript, setTranscript] = useState<Transcript>({ interim: '', final: '' });
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      setIsAvailable(true);
    } else {
      setIsAvailable(false);
    }
  }, []);

  const startTimer = useCallback(() => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isRecording) return;

    setError(null);
    setTranscript({ interim: '', final: '' });
    setInterimTranscript('');
    setIsRecording(true);
    setIsProcessing(false);
    startTimer();

    const recognition = recognitionRef.current;
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript(prev => ({ ...prev, final: prev.final + final.trim() }));
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError("I didn't catch that. Try again?");
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access needed. Please enable in browser settings.');
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsRecording(false);
      stopTimer();
    };

    recognition.onend = () => {
      // This can be called automatically or by stopRecognition()
      if (isRecording) {
         setIsRecording(false);
         if (transcript.final || interimTranscript) {
            setIsProcessing(true);
            setTranscript(prev => ({...prev, final: (prev.final + " " + interimTranscript).trim()}))
            setInterimTranscript("");
         }
      }
      stopTimer();
      if(timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    recognition.start();

    // Auto-stop after max recording time
    if (maxRecordingTime) {
      timeoutRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecognition();
        }
      }, maxRecordingTime * 1000);
    }
  }, [continuous, interimResults, isRecording, lang, maxRecordingTime, startTimer, stopTimer, interimTranscript, transcript.final]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
        setIsProcessing(true);
        // onend will handle final transcript aggregation
    }
     if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isRecording]);

  const cancelRecognition = useCallback(() => {
     if (recognitionRef.current && isRecording) {
        recognitionRef.current.abort();
        setIsRecording(false);
        setIsProcessing(false);
        setTranscript({ interim: '', final: '' });
        setInterimTranscript('');
        setError(null);
        stopTimer();
     }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
  }, [isRecording, stopTimer]);
  
  // Cleanup processing state after final transcript is processed
  useEffect(() => {
    if (transcript.final) {
      setIsProcessing(false);
    }
  }, [transcript.final])


  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopTimer();
    };
  }, [stopTimer]);

  return {
    isRecording,
    isProcessing,
    isAvailable,
    transcript,
    interimTranscript,
    startRecognition,
    stopRecognition,
    cancelRecognition,
    error,
    recordingTime,
  };
};
