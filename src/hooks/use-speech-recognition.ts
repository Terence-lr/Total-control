
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxRecordingTime?: number; // in seconds
  onTranscriptFinal?: (finalTranscript: string) => void;
  isGenerating?: boolean; // Added to options
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
    maxRecordingTime = 90, // 1.5 minutes
    onTranscriptFinal,
    isGenerating: isParentGenerating = false,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [transcript, setTranscript] = useState<Transcript>({ interim: '', final: '' });
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedFinalTranscript = useRef<string>('');
  const interimTranscript = useRef<string>('');


  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      setIsAvailable(true);
    } else {
      setIsAvailable(false);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prevTime => {
        if (prevTime + 1 >= maxRecordingTime) {
            if (recognitionRef.current && isRecording) {
                recognitionRef.current.stop();
            }
        }
        return prevTime + 1;
      });
    }, 1000);
  }, [maxRecordingTime, isRecording]);


  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current && isRecordingRef.current) {
        recognitionRef.current.stop(); // onend will be triggered
    }
     if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isRecordingRef.current) return;

    setError(null);
    setTranscript({ interim: '', final: '' });
    accumulatedFinalTranscript.current = '';
    interimTranscript.current = '';
    
    setIsRecording(true);
    setIsProcessing(false);
    startTimer();

    const recognition = recognitionRef.current;
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event) => {
      let latestInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
            accumulatedFinalTranscript.current += result[0].transcript + ' ';
        } else {
            latestInterim += result[0].transcript;
        }
      }
      interimTranscript.current = latestInterim;
      setTranscript({ interim: latestInterim, final: accumulatedFinalTranscript.current });
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
      if (!isRecordingRef.current) return; // Prevent running on cancel/abort

      setIsRecording(false);
      setIsProcessing(true); // Show processing indicator immediately
      stopTimer();
      
      const finalTranscript = (accumulatedFinalTranscript.current + ' ' + interimTranscript.current).trim();
      
      // Use the callback to pass the final transcript to the parent component
      if (onTranscriptFinal && finalTranscript) {
          onTranscriptFinal(finalTranscript);
      }
      
      accumulatedFinalTranscript.current = '';
      interimTranscript.current = '';
    };

    recognition.start();

  }, [continuous, interimResults, lang, startTimer, stopTimer, onTranscriptFinal]);

  const cancelRecognition = useCallback(() => {
     if (recognitionRef.current) { // No need to check for isRecording
        setIsRecording(false); // This will prevent onend from running
        recognitionRef.current.abort();
     }
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    setIsProcessing(false);
    setTranscript({ interim: '', final: '' });
    accumulatedFinalTranscript.current = '';
    interimTranscript.current = '';
    setError(null);
    stopTimer();

  }, [stopTimer]);

  const isGenerating = isProcessing || isParentGenerating;
  
  useEffect(() => {
    if (!isGenerating) {
        setIsProcessing(false);
    }
  }, [isGenerating]);
  
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
    isProcessing: isGenerating,
    isAvailable,
    transcript: {interim: transcript.interim, final: transcript.final},
    startRecognition,
    stopRecognition,
    cancelRecognition,
    error,
    recordingTime,
    setTranscript, // expose setTranscript to allow parent to clear it
  };
};
