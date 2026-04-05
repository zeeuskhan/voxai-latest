/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Settings2, 
  Mic2, 
  Download,
  Sparkles,
  Info,
  ChevronDown,
  Activity,
  User,
  UserRound,
  Cpu,
  Film,
  Eye,
  Gauge,
  Music2,
  Filter,
  FileAudio,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Emotion = 'neutral' | 'happy' | 'sad' | 'dramatic' | 'story';
type VoiceGender = 'male' | 'female' | 'neutral';
type VoiceStyle = 'standard' | 'robotic' | 'cinematic';

interface VoiceMetadata {
  gender: VoiceGender;
  style: VoiceStyle;
}

const NEURAL_VOICES = [
  { id: 'zephyr_en', voice: 'Zephyr', name: 'Zephyr (Neural Male)', gender: 'male' },
  { id: 'puck_en', voice: 'Puck', name: 'Puck (Neural Male)', gender: 'male' },
  { id: 'charon_en', voice: 'Charon', name: 'Charon (Neural Male)', gender: 'male' },
  { id: 'kore_en', voice: 'Kore', name: 'Kore (Neural Female)', gender: 'female' },
  { id: 'fenrir_en', voice: 'Fenrir', name: 'Fenrir (Neural Male)', gender: 'male' },
  { id: 'kore_hi', voice: 'Kore', name: 'Kore (Neural Hindi Female)', gender: 'female' },
  { id: 'zephyr_hi', voice: 'Zephyr', name: 'Zephyr (Neural Hindi Male)', gender: 'male' },
  { id: 'puck_hi', voice: 'Puck', name: 'Puck (Neural Hindi Male)', gender: 'male' },
  { id: 'charon_hi', voice: 'Charon', name: 'Charon (Neural Hindi Male)', gender: 'male' },
  { id: 'fenrir_hi', voice: 'Fenrir', name: 'Fenrir (Neural Hindi Male)', gender: 'male' },
];

const CHARACTER_PERSONAS = [
  { id: 'farmer', name: 'Farmer (Kisan)', icon: '👨‍🌾', pitch: 0.8, rate: 0.9, description: 'Deep, rural, strong tone' },
  { id: 'old', name: 'Old Man', icon: '👴', pitch: 0.6, rate: 0.7, description: 'Slow, heavy, aged voice' },
  { id: 'child', name: 'Child', icon: '🧒', pitch: 1.5, rate: 1.2, description: 'High pitch, soft, fast' },
  { id: 'female', name: 'Female', icon: '👩', pitch: 1.2, rate: 1.0, description: 'Clear, soft, natural tone' },
  { id: 'hindi_news', name: 'Hindi News', icon: '🇮🇳', pitch: 1.0, rate: 1.1, description: 'Formal Indian Hindi anchor' },
  { id: 'dadi', name: 'Dadi (Grandmother)', icon: '👵', pitch: 0.7, rate: 0.75, description: 'Warm, slow, wise Hindi tone' },
  { id: 'bollywood', name: 'Bollywood Star', icon: '🎬', pitch: 1.1, rate: 1.1, description: 'Dramatic, deep, energetic' },
  { id: 'teacher', name: 'Teacher (Guru)', icon: '👨‍🏫', pitch: 1.0, rate: 0.95, description: 'Clear, authoritative, formal' },
  { id: 'yoga', name: 'Yoga Instructor', icon: '🧘', pitch: 1.1, rate: 0.8, description: 'Calm, soft, rhythmic' },
  { id: 'rickshaw', name: 'Rickshaw Driver', icon: '🛺', pitch: 0.85, rate: 1.15, description: 'Fast, loud, street-style' },
  { id: 'narrator', name: 'Narrator', icon: '🎙️', pitch: 0.9, rate: 0.85, description: 'Cinematic, deep storytelling' },
];

const createWavHeader = (pcmLength: number, sampleRate: number = 24000) => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + pcmLength, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * blockAlign)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channels * bytesPerSample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, pcmLength, true);

  return buffer;
};

export default function App() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Ready to synthesize');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [activeStyle, setActiveStyle] = useState<VoiceStyle>('standard');
  const [selectedNeuralVoice, setSelectedNeuralVoice] = useState<string>(NEURAL_VOICES[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English (US)');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  // Recording & Download States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('voxai-speech');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isGeneratingHQ, setIsGeneratingHQ] = useState(false);

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Heuristic to categorize system voices
  const getVoiceMetadata = (voice: SpeechSynthesisVoice): VoiceMetadata => {
    const name = voice.name.toLowerCase();
    let gender: VoiceGender = 'neutral';
    let style: VoiceStyle = 'standard';

    const maleNames = ['david', 'mark', 'james', 'richard', 'thomas', 'paul', 'george', 'stefan', 'marcus', 'danny', 'ravi', 'amit', 'rahul', 'arjun'];
    const femaleNames = ['zira', 'samantha', 'hazel', 'susan', 'catherine', 'linda', 'heera', 'veena', 'elsa', 'anna', 'priya', 'neha', 'ananya', 'isha'];

    if (maleNames.some(n => name.includes(n))) gender = 'male';
    else if (femaleNames.some(n => name.includes(n))) gender = 'female';

    if (name.includes('robot') || name.includes('synthetic')) style = 'robotic';
    
    return { gender, style };
  };

  useEffect(() => {
    const loadVoices = () => {
      if (synth) {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoice) {
          const defaultVoice = availableVoices.find(v => v.lang.includes('hi')) || availableVoices.find(v => v.lang.includes('en')) || availableVoices[0];
          setSelectedVoice(defaultVoice.voiceURI);
        }
      }
    };

    loadVoices();
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synth) synth.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [synth, selectedVoice]);

  const filteredVoices = useMemo(() => {
    const uniqueVoices = new Map<string, SpeechSynthesisVoice>();
    voices.forEach(v => {
      if (!uniqueVoices.has(v.voiceURI)) {
        uniqueVoices.set(v.voiceURI, v);
      }
    });
    
    const uniqueList = Array.from(uniqueVoices.values());
    return uniqueList.filter(v => {
      if (genderFilter === 'all') return true;
      const meta = getVoiceMetadata(v);
      return meta.gender === genderFilter;
    });
  }, [voices, genderFilter]);

  const applyVoiceSettings = (utterance: SpeechSynthesisUtterance) => {
    let finalPitch = pitch;
    let finalRate = rate;

    // Apply Style Modifiers
    if (activeStyle === 'robotic') {
      finalPitch = 0.5;
      finalRate = 0.8;
    } else if (activeStyle === 'cinematic') {
      finalPitch = 0.7;
      finalRate = 0.85;
    }

    // Apply Emotion Modifiers
    switch (emotion) {
      case 'happy':
        finalPitch += 0.2;
        finalRate += 0.1;
        break;
      case 'sad':
        finalPitch -= 0.2;
        finalRate -= 0.1;
        break;
      case 'dramatic':
        finalPitch -= 0.1;
        finalRate -= 0.2;
        break;
      case 'story':
        finalRate -= 0.1;
        break;
    }

    utterance.pitch = Math.max(0.1, Math.min(2, finalPitch));
    utterance.rate = Math.max(0.1, Math.min(10, finalRate));
    utterance.volume = volume;

    const voice = voices.find(v => v.voiceURI === selectedVoice);
    if (voice) utterance.voice = voice;
  };

  const handleSpeak = (customText?: string, isForRecording = false) => {
    const textToSpeak = customText || text;
    if (!synth || !textToSpeak) return;

    if (isPaused && !customText) {
      synth.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      setStatus('Resumed speaking...');
      return;
    }

    synth.cancel();
    setIsLoading(true);
    setStatus(isForRecording ? 'Recording neural output...' : (customText ? 'Previewing voice...' : 'Synthesizing AI voice...'));

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      applyVoiceSettings(utterance);

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        setStatus(isForRecording ? 'Recording...' : (customText ? 'Previewing...' : 'Speaking...'));
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setStatus(isForRecording ? 'Recording complete' : 'Finished speaking');
        if (isRecording) {
          stopRecording();
        }
      };

      utterance.onerror = () => {
        setIsLoading(false);
        setIsSpeaking(false);
        setStatus('Error occurred');
        if (isRecording) stopRecording();
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    }, 600);
  };

  const startRecording = async () => {
    if (!text) return;
    
    try {
      // Note: Capturing tab audio requires user interaction and permission
      // We use getDisplayMedia to capture the system/tab audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true
      });

      // Filter for audio only
      const audioStream = new MediaStream(stream.getAudioTracks());
      
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordedChunks(chunks);
        setIsRecording(false);
        setStatus('Ready to download');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      setIsRecording(true);
      setRecordedChunks([]);
      setAudioUrl(null);
      setRecordingDuration(0);
      
      mediaRecorder.start();
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      handleSpeak(undefined, true);
    } catch (err) {
      console.error('Recording error:', err);
      setStatus('Recording failed: Permission denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadRecorded = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${fileName || 'voxai-speech'}.webm`;
    a.click();
  };

  const downloadHQ = async () => {
    if (!text) return;
    setIsGeneratingHQ(true);
    setStatus('Generating Neural HQ Audio...');
    
    try {
      const ai = new GoogleGenAI({ AIzaSyAjvwWpme5Av2XfUbxiGZb8G67t-0YLovw });
      // Enhance prompt with emotion and language context
      const emotionPrompt = emotion === 'neutral' ? '' : ` with a ${emotion} tone`;
      const langPrompt = selectedLanguage === 'English (US)' ? 'English' : 'Indian Hindi';
      const prompt = `Convert this text to speech in ${langPrompt} language with a natural ${langPrompt} accent${emotionPrompt}: ${text}`;
      
      const neuralVoice = NEURAL_VOICES.find(v => v.id === selectedNeuralVoice);
      const voiceName = neuralVoice ? neuralVoice.voice : 'Zephyr';

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error('No audio data received from neural engine');

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Audio);
      const pcmData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pcmData[i] = binaryString.charCodeAt(i);
      }

      // Add WAV header (Gemini TTS returns 24kHz 16-bit mono PCM)
      const wavHeader = createWavHeader(pcmData.length, 24000);
      const wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'voxai-speech'}.wav`;
      a.click();
      
      setStatus('Neural HQ Ready');
    } catch (err) {
      console.error('HQ Download error:', err);
      setStatus('Neural Generation failed');
    } finally {
      setIsGeneratingHQ(false);
    }
  };

  const handleNeuralPreview = async () => {
    if (!text || isLoading) return;
    setIsLoading(true);
    setStatus('Generating Neural Preview...');
    
    try {
      const ai = new GoogleGenAI({ AIzaSyAjvwWpme5Av2XfUbxiGZb8G67t-0YLovw });
      const emotionPrompt = emotion === 'neutral' ? '' : ` with a ${emotion} tone`;
      const langPrompt = selectedLanguage === 'English (US)' ? 'English' : 'Indian Hindi';
      const prompt = `Convert this text to speech in ${langPrompt} language with a natural ${langPrompt} accent${emotionPrompt}: ${text.slice(0, 200)}`; // Preview first 200 chars
      
      const neuralVoice = NEURAL_VOICES.find(v => v.id === selectedNeuralVoice);
      const voiceName = neuralVoice ? neuralVoice.voice : 'Zephyr';

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error('No audio data received');

      const binaryString = atob(base64Audio);
      const pcmData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pcmData[i] = binaryString.charCodeAt(i);
      }

      const wavHeader = createWavHeader(pcmData.length, 24000);
      const wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      
      const audio = new Audio(url);
      audio.onplay = () => {
        setIsSpeaking(true);
        setStatus('Playing Neural Preview...');
      };
      audio.onended = () => {
        setIsSpeaking(false);
        setStatus('Neural Preview finished');
      };
      audio.play();
    } catch (err) {
      console.error('Neural Preview error:', err);
      setStatus('Neural Preview failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacterSelect = (charId: string) => {
    const char = CHARACTER_PERSONAS.find(c => c.id === charId);
    if (char) {
      setSelectedCharacter(charId);
      setPitch(char.pitch);
      setRate(char.rate);
      setStatus(`Switched to ${char.name} persona`);
    }
  };

  const handleCharacterPreview = (charId: string) => {
    const char = CHARACTER_PERSONAS.find(c => c.id === charId);
    if (char) {
      const utterance = new SpeechSynthesisUtterance(`This is a preview of the ${char.name} voice.`);
      const voice = voices.find(v => v.voiceURI === selectedVoice) || voices[0];
      if (voice) utterance.voice = voice;
      utterance.pitch = char.pitch;
      utterance.rate = char.rate;
      utterance.volume = volume;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setStatus(`Previewing ${char.name}...`);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setStatus('Preview finished');
      };
      
      synth?.cancel();
      synth?.speak(utterance);
    }
  };

  const handlePreview = () => {
    handleSpeak("This is a preview of the selected voice using current settings.");
  };

  const handleStop = () => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setStatus('Stopped');
      if (isRecording) stopRecording();
    }
  };

  const handlePause = () => {
    if (synth && isSpeaking && !isPaused) {
      synth.pause();
      setIsPaused(true);
      setStatus('Paused');
    } else if (synth && isPaused) {
      synth.resume();
      setIsPaused(false);
      setStatus('Speaking...');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-16">
        {/* Header */}
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center md:justify-start gap-3 mb-4"
            >
              <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
                VoxAI Studio
              </h1>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-400 text-lg max-w-xl"
            >
              Advanced neural synthesis engine for professional voice generation. 
              Now with high-quality MP3 export and tab recording.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md"
          >
            <Activity className={`w-4 h-4 ${isSpeaking ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`} />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{status}</span>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Input Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                    <Mic2 className="w-3 h-3" /> Synthesis Input
                  </label>
                  <div className="text-[10px] text-gray-600 font-mono">
                    {text.length} characters
                  </div>
                </div>
                
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter script for neural synthesis..."
                  className="w-full h-72 md:h-96 bg-transparent border-none focus:ring-0 text-xl md:text-2xl text-gray-200 placeholder:text-gray-800 resize-none font-light leading-relaxed"
                />

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleSpeak()}
                      disabled={!text || isLoading || isRecording}
                      className={`group relative flex items-center gap-3 px-10 py-4 rounded-2xl font-bold transition-all duration-500 overflow-hidden ${
                        !text || isLoading || isRecording
                        ? 'bg-gray-900 text-gray-700 cursor-not-allowed' 
                        : 'bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                      {isLoading ? (
                        <Activity className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 fill-current" />
                      )}
                      <span className="relative">{isPaused ? 'Resume' : 'Generate Speech'}</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handlePause}
                        disabled={!isSpeaking && !isPaused}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all active:scale-95 disabled:opacity-30"
                        title="Pause/Resume"
                      >
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      </button>

                      <button 
                        onClick={handleStop}
                        disabled={!isSpeaking && !isPaused}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-300 transition-all active:scale-95 disabled:opacity-30"
                        title="Stop"
                      >
                        <Square className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={startRecording}
                      disabled={!text || isRecording || isLoading}
                      className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all ${
                        isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <Mic2 className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />
                      {isRecording ? 'Recording...' : 'Record & Export'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Visualizer & Recording Status */}
            <div className="space-y-4">
              <div className="h-20 bg-[#0a0a0a]/40 backdrop-blur-sm rounded-3xl border border-white/5 flex items-end justify-center gap-1.5 px-10 pb-4 overflow-hidden">
                {[...Array(60)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={isSpeaking ? {
                      height: [4, Math.random() * 40 + 10, 4],
                      opacity: [0.3, 1, 0.3]
                    } : { height: 4, opacity: 0.1 }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.4 + Math.random() * 0.6,
                    }}
                    className={`w-1 rounded-full ${isSpeaking ? 'bg-gradient-to-t from-cyan-500 to-purple-500' : 'bg-white'}`}
                  />
                ))}
              </div>

              <AnimatePresence>
                {(isRecording || audioUrl) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-wrap items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${isRecording ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {isRecording ? <Activity className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{isRecording ? 'Recording Tab Audio' : 'Recording Ready'}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> {formatTime(recordingDuration)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <input 
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Filename..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500/50"
                      />
                      <button 
                        onClick={downloadRecorded}
                        disabled={!audioUrl}
                        className="px-6 py-2 bg-cyan-500 text-black font-bold rounded-xl text-sm hover:bg-cyan-400 transition-all disabled:opacity-30"
                      >
                        Download .WEBM
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sidebar Controls */}
          <motion.aside 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-5 space-y-6"
          >
            {/* Export Panel */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Neural HQ Studio
                </h3>
                {isGeneratingHQ && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Language / Accent</label>
                    <div className="relative group">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] appearance-none focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all cursor-pointer group-hover:bg-white/10"
                      >
                        <option value="English (US)" className="bg-[#111]">English (US)</option>
                        <option value="Hindi (India)" className="bg-[#111]">Hindi (India)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neural Voice</label>
                    <div className="relative group">
                      <select
                        value={selectedNeuralVoice}
                        onChange={(e) => setSelectedNeuralVoice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] appearance-none focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all cursor-pointer group-hover:bg-white/10"
                      >
                        {NEURAL_VOICES.map((voice) => (
                          <option key={voice.id} value={voice.id} className="bg-[#111] text-white py-2">
                            {voice.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleNeuralPreview}
                    disabled={!text || isLoading}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-30"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button 
                    onClick={downloadHQ}
                    disabled={!text || isGeneratingHQ}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-all disabled:opacity-30"
                  >
                    <Download className="w-4 h-4" /> Export .WAV
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                  Neural voices provide superior clarity and natural inflection. 
                  Generated audio is exported as high-fidelity 24kHz WAV.
                </p>
              </div>
            </div>

            {/* Character Personas Panel */}
            <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> Character Personas
                </h3>
                {selectedCharacter && (
                  <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">
                    Active: {CHARACTER_PERSONAS.find(c => c.id === selectedCharacter)?.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {CHARACTER_PERSONAS.map((char) => (
                  <motion.div
                    key={char.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCharacterSelect(char.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCharacterSelect(char.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all text-left cursor-pointer outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      selectedCharacter === char.id 
                        ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`text-2xl p-2 rounded-xl ${selectedCharacter === char.id ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                      {char.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold ${selectedCharacter === char.id ? 'text-purple-400' : 'text-white'}`}>
                        {char.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{char.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCharacterPreview(char.id);
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      title="Preview Persona"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    {selectedCharacter === char.id && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Voice Engine Panel */}
            <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> Voice Engine
                  </h3>
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 text-gray-600" />
                    <select 
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value as any)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-cyan-500 outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#111]">All Genders</option>
                      <option value="male" className="bg-[#111]">Male Only</option>
                      <option value="female" className="bg-[#111]">Female Only</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="relative group">
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm appearance-none focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all cursor-pointer group-hover:bg-white/10"
                    >
                      {filteredVoices.map((voice) => {
                        const meta = getVoiceMetadata(voice);
                        return (
                          <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[#111] text-white py-2">
                            {voice.name} ({voice.lang}) [{meta.gender.toUpperCase()}]
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>

                  <button 
                    onClick={handlePreview}
                    className="w-full py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview Selected Voice
                  </button>
                </div>
              </div>

              {/* Voice Style Categories */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Acoustic Style</label>
                <div className="grid grid-cols-3 gap-3">
                  <StyleButton 
                    active={activeStyle === 'standard'} 
                    onClick={() => setActiveStyle('standard')}
                    icon={<UserRound className="w-4 h-4" />}
                    label="Natural"
                  />
                  <StyleButton 
                    active={activeStyle === 'robotic'} 
                    onClick={() => setActiveStyle('robotic')}
                    icon={<Cpu className="w-4 h-4" />}
                    label="Robotic"
                  />
                  <StyleButton 
                    active={activeStyle === 'cinematic'} 
                    onClick={() => setActiveStyle('cinematic')}
                    icon={<Film className="w-4 h-4" />}
                    label="Cinematic"
                  />
                </div>
              </div>

              {/* Parameters */}
              <div className="space-y-8 pt-4">
                <ControlSlider 
                  label="Speech Rate" 
                  icon={<Gauge className="w-3 h-3" />}
                  value={rate} 
                  min={0.5} 
                  max={2} 
                  step={0.1} 
                  onChange={setRate} 
                  suffix="x"
                />
                <ControlSlider 
                  label="Vocal Pitch" 
                  icon={<Music2 className="w-3 h-3" />}
                  value={pitch} 
                  min={0} 
                  max={2} 
                  step={0.1} 
                  onChange={setPitch} 
                />
                <ControlSlider 
                  label="Master Volume" 
                  icon={<Volume2 className="w-3 h-3" />}
                  value={volume} 
                  min={0} 
                  max={1} 
                  step={0.01} 
                  onChange={setVolume} 
                  suffix="%"
                  displayMultiplier={100}
                />
              </div>

              {/* Emotion Matrix */}
              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Emotional Inflection</label>
                <div className="flex flex-wrap gap-2">
                  {(['neutral', 'happy', 'sad', 'dramatic', 'story'] as Emotion[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmotion(e)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        emotion === e 
                        ? 'bg-white text-black border-white' 
                        : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-300">Pro Tip</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  For the most human-like results, use a Speech Rate of 0.9x and a Pitch of 1.1. 
                  Chrome's "Google" voices typically offer the best neural quality.
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-16 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-8 mb-6 grayscale opacity-30">
          <div className="text-xs font-bold tracking-widest">NEURAL CORE</div>
          <div className="text-xs font-bold tracking-widest">VOX ENGINE</div>
          <div className="text-xs font-bold tracking-widest">AI SYNTH</div>
        </div>
        <p className="text-gray-700 text-[10px] tracking-[0.4em] uppercase">
          &copy; 2026 VoxAI Studio &bull; All Rights Reserved
        </p>
      </footer>
    </div>
  );
}

function StyleButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
        active 
        ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
        : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function ControlSlider({ label, icon, value, min, max, step, onChange, suffix = "", displayMultiplier = 1 }: { 
  label: string, 
  icon: React.ReactNode,
  value: number, 
  min: number, 
  max: number, 
  step: number,
  onChange: (val: number) => void,
  suffix?: string,
  displayMultiplier?: number
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {icon}
          {label}
        </div>
        <span className="text-xs font-mono text-cyan-400">
          {(value * displayMultiplier).toFixed(displayMultiplier > 1 ? 0 : 1)}{suffix}
        </span>
      </div>
      <div className="relative h-1.5 flex items-center">
        <div className="absolute inset-0 bg-white/5 rounded-full" />
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" 
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />
        <div 
          className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none"
          style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 8px)` }}
        />
      </div>
    </div>
  );
}

