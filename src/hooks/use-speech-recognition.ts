
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
        // This is a temporary accumulation. The onend event will finalize it.
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
      setIsProcessing(false);
      stopTimer();
    };

    recognition.onend = () => {
      if (!isRecording) return; // if it was cancelled, do nothing

      setIsRecording(false);
      setIsProcessing(true); // Start processing
      
      // Combine the last interim transcript with the final one
      setTranscript(prev => {
        const finalTranscript = (prev.final + ' ' + interimTranscript).trim();
        return { interim: '', final: finalTranscript };
      });
      setInterimTranscript("");

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopTimer();
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
  }, [continuous, interimResults, isRecording, lang, maxRecordingTime, startTimer, stopTimer, interimTranscript]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop(); // onend will be triggered
    }
     if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isRecording]);

  const cancelRecognition = useCallback(() => {
     if (recognitionRef.current && isRecording) {
        recognitionRef.current.abort();
     }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    setIsRecording(false);
    setIsProcessing(false);
    setTranscript({ interim: '', final: '' });
    setInterimTranscript('');
    setError(null);
    stopTimer();

  }, [isRecording, stopTimer]);
  
  // Cleanup processing state after final transcript is passed to parent
  useEffect(() => {
    if (transcript.final === '' && isProcessing) {
        setIsProcessing(false);
    }
  }, [transcript.final, isProcessing])


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
    setTranscript, // expose setTranscript to allow parent to clear it
  };
};
