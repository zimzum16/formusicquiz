import { useState, useRef } from 'react';
import {
  Upload, CheckCircle, Info, Image, Scissors, Play, Pause,
  Download, Plus, ChevronLeft, Volume2, TrendingUp, TrendingDown, X, AlertCircle, Loader2
} from 'lucide-react';
import { formatDuration, extractFilename } from '../lib/audioMetadata';
import { decodeAudio, extractWaveform, trimSegment, encodeMP3, downloadBlob } from '../lib/audioTrim';

interface Segment {
  id: number;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  showFadeIn: boolean;
  showFadeOut: boolean;
}

interface LoadedFile {
  name: string;
  size: number;
  duration: number;
}

const BARS = 80;

const FadeSlider = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div className="flex flex-col gap-1 bg-white border border-gray-100 rounded-xl p-3 shadow-sm w-36">
    <span className="text-xs text-gray-500">{label}</span>
    <input type="range" min={1} max={5} value={value} onChange={e => onChange(Number(e.target.value))} className="accent-teal-500 w-full" />
    <span className="text-xs font-semibold text-teal-600 text-center">{value} сек</span>
  </div>
);

export default function Editor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);

  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [geniusLoaded, setGeniusLoaded] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimDone, setTrimDone] = useState(false);
  const [trimmedBuffers, setTrimmedBuffers] = useState<AudioBuffer[]>([]);
  const [segments, setSegments] = useState<Segment[]>([
    { id: 1, start: 15, end: 40, fadeIn: 2, fadeOut: 2, showFadeIn: false, showFadeOut: false },
  ]);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setDecodeError('Пожалуйста, выберите аудиофайл');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setDecodeError('Файл слишком большой. Максимум 50 МБ');
      return;
    }

    setIsDecoding(true);
    setDecodeError(null);
    setTrimDone(false);
    setTrimmedBuffers([]);
    setGeniusLoaded(false);

    try {
      const buffer = await decodeAudio(file);
      const waveform = extractWaveform(buffer, BARS);

      setAudioBuffer(buffer);
      setWaveformData(waveform);
      setLoadedFile({ name: file.name, size: file.size, duration: buffer.duration });

      const maxEnd = Math.min(40, Math.floor(buffer.duration * 0.67));
      setSegments([{ id: 1, start: 0, end: maxEnd, fadeIn: 2, fadeOut: 2, showFadeIn: false, showFadeOut: false }]);
    } catch {
      setDecodeError('Не удалось декодировать файл. Убедитесь, что это аудио.');
    } finally {
      setIsDecoding(false);
    }
  };

  const handleRemoveFile = () => {
    stopPlayback();
    setLoadedFile(null);
    setAudioBuffer(null);
    setWaveformData([]);
    setTrimDone(false);
    setTrimmedBuffers([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stopPlayback = () => {
    try { playbackSourceRef.current?.stop(); } catch {}
    playbackCtxRef.current?.close();
    playbackSourceRef.current = null;
    playbackCtxRef.current = null;
    setPlaying(null);
  };

  const togglePlay = async (idx: number) => {
    if (playing !== null) {
      stopPlayback();
      if (playing === idx) return;
    }

    const buf = trimmedBuffers[idx];
    if (!buf) return;

    const ctx = new AudioContext();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    src.onended = () => setPlaying(null);

    playbackSourceRef.current = src;
    playbackCtxRef.current = ctx;
    setPlaying(idx);
  };

  const handleTrim = async () => {
    if (!audioBuffer) return;
    setIsTrimming(true);
    stopPlayback();

    try {
      const buffers = await Promise.all(
        segments.map(seg =>
          trimSegment(audioBuffer, seg.start, seg.end, seg.showFadeIn ? seg.fadeIn : 0, seg.showFadeOut ? seg.fadeOut : 0)
        )
      );
      setTrimmedBuffers(buffers);
      setTrimDone(true);
    } finally {
      setIsTrimming(false);
    }
  };

  const handleDownload = (idx: number) => {
    const buf = trimmedBuffers[idx];
    if (!buf || !loadedFile) return;
    const base = extractFilename(new File([], loadedFile.name));
    const seg = segments[idx];
    downloadBlob(encodeMP3(buf), `${base}_${formatDuration(seg.start)}-${formatDuration(seg.end)}.mp3`);
  };

  const addSegment = () =>
    setSegments(prev => [...prev, { id: Date.now(), start: 0, end: 30, fadeIn: 1, fadeOut: 1, showFadeIn: false, showFadeOut: false }]);

  const updateSegment = (id: number, field: keyof Segment, value: number | boolean) =>
    setSegments(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  const maxDuration = loadedFile ? Math.floor(loadedFile.duration) : 60;
  const trackName = loadedFile ? extractFilename(new File([], loadedFile.name)) : 'Unknown';
  const searchQuery = encodeURIComponent(trackName);
  const imageLinks = [
    { name: 'Яндекс Картинки', url: `https://yandex.ru/images/search?text=${searchQuery}`, color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-100' },
    { name: 'Google Images', url: `https://www.google.com/search?tbm=isch&q=${searchQuery}`, color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100' },
    { name: 'Bing Images', url: `https://www.bing.com/images/search?q=${searchQuery}`, color: 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-100' },
    { name: 'DuckDuckGo', url: `https://duckduckgo.com/?iax=images&ia=images&q=${searchQuery}`, color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-100' },
  ];

  return (
    <main className="pt-10 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <ChevronLeft size={18} className="text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Аудио редактор</h1>
            <p className="text-gray-500 text-sm">Загрузите файл, выберите фрагменты, скачайте результат</p>
          </div>
        </div>

        {/* Block 1: Upload */}
        <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Upload size={16} className="text-teal-500" />
            Загрузите аудиофайл
          </h2>
          <p className="text-gray-400 text-sm mb-5">Поддерживаются MP3, WAV, OGG до 50 МБ</p>

          {!loadedFile ? (
            <>
              <div
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-teal-100 flex items-center justify-center mb-3 transition-colors">
                  {isDecoding
                    ? <Loader2 size={22} className="text-teal-500 animate-spin" />
                    : <Upload size={22} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                  }
                </div>
                <p className="text-gray-700 font-medium mb-1">
                  {isDecoding ? 'Декодирование...' : 'Перетащите файл или нажмите для выбора'}
                </p>
                <p className="text-gray-400 text-sm">MP3 · WAV · OGG · до 50 МБ</p>
              </div>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={e => { const f = e.currentTarget.files?.[0]; if (f) handleFileSelect(f); }} disabled={isDecoding} className="hidden" />
            </>
          ) : (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CheckCircle size={20} className="text-teal-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{loadedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(loadedFile.size / (1024 * 1024)).toFixed(1)} МБ · {formatDuration(loadedFile.duration)}
                  </p>
                </div>
              </div>
              <button onClick={handleRemoveFile} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1">
                <X size={18} />
              </button>
            </div>
          )}

          {decodeError && (
            <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{decodeError}</p>
            </div>
          )}
        </section>

        {/* Block 2: Track info */}
        {loadedFile && (
          <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info size={16} className="text-sky-500" />
              Информация о треке
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Название', value: geniusLoaded ? trackName : trackName },
                { label: 'Длительность', value: formatDuration(loadedFile.duration) },
                { label: 'Исполнитель', value: geniusLoaded ? '—' : '—' },
                { label: 'Год', value: geniusLoaded ? '—' : '—' },
                { label: 'Авторы', value: geniusLoaded ? '—' : '—', colSpan: true },
              ].map((item, i) => (
                <div key={i} className={`bg-gray-50 rounded-xl px-4 py-3 ${item.colSpan ? 'col-span-2' : ''}`}>
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
            {!geniusLoaded ? (
              <button onClick={() => setGeniusLoaded(true)} className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Уточнить данные с Genius
              </button>
            ) : (
              <a href="#" className="inline-flex items-center gap-1.5 text-sky-500 hover:text-sky-600 text-sm font-medium transition-colors">
                Открыть текст на Genius <span className="text-xs">↗</span>
              </a>
            )}
          </section>
        )}

        {/* Block 3: Image search */}
        {loadedFile && (
          <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Image size={16} className="text-orange-400" />
              Поиск изображений
            </h2>
            <p className="text-gray-400 text-sm mb-5">Поиск по: <span className="text-gray-700 font-medium">{trackName}</span></p>
            <div className="flex flex-wrap gap-2">
              {imageLinks.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${link.color}`}>
                  {link.name} <span className="text-xs opacity-60">↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Block 4: Waveform & segments */}
        {loadedFile && (
          <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Volume2 size={16} className="text-teal-500" />
              Выбор фрагментов
            </h2>

            {segments.map((seg, idx) => (
              <div key={seg.id} className="space-y-3">
                {idx > 0 && <div className="border-t border-gray-100 pt-5" />}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Фрагмент {idx + 1}</p>
                  {segments.length > 1 && (
                    <button onClick={() => setSegments(prev => prev.filter(s => s.id !== seg.id))} className="text-gray-300 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Waveform */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="relative flex items-end gap-0.5 h-16 mb-1">
                    {Array.from({ length: BARS }, (_, i) => {
                      const pct = i / BARS;
                      const inRange = pct >= seg.start / maxDuration && pct <= seg.end / maxDuration;
                      const h = waveformData.length > 0
                        ? Math.max(4, waveformData[i] * 56)
                        : 12 + Math.abs(Math.sin(i * 0.5 + 1) * 18) + Math.abs(Math.cos(i * 0.3) * 12);
                      return (
                        <div key={i} className={`flex-1 rounded-sm transition-colors duration-150 ${inRange ? 'bg-teal-400' : 'bg-gray-200'}`} style={{ height: `${h}px` }} />
                      );
                    })}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-teal-500" style={{ left: `${(seg.start / maxDuration) * 100}%` }}>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-teal-500 rounded-full" />
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-teal-500" style={{ left: `${(seg.end / maxDuration) * 100}%` }}>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-teal-500 rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0:00</span>
                    <span>{formatDuration(maxDuration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateSegment(seg.id, 'showFadeIn', !seg.showFadeIn)}
                      className={`p-2 rounded-lg border transition-colors ${seg.showFadeIn ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-white border-gray-200 text-gray-400 hover:text-teal-500'}`}
                      title="Нарастание">
                      <TrendingUp size={14} />
                    </button>
                    {seg.showFadeIn && <FadeSlider value={seg.fadeIn} onChange={v => updateSegment(seg.id, 'fadeIn', v)} label="Нарастание" />}
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Начало (сек)</label>
                      <input type="number" value={seg.start} min={0} max={seg.end - 1}
                        onChange={e => updateSegment(seg.id, 'start', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Конец (сек)</label>
                      <input type="number" value={seg.end} min={seg.start + 1} max={maxDuration}
                        onChange={e => updateSegment(seg.id, 'end', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {seg.showFadeOut && <FadeSlider value={seg.fadeOut} onChange={v => updateSegment(seg.id, 'fadeOut', v)} label="Затухание" />}
                    <button onClick={() => updateSegment(seg.id, 'showFadeOut', !seg.showFadeOut)}
                      className={`p-2 rounded-lg border transition-colors ${seg.showFadeOut ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-white border-gray-200 text-gray-400 hover:text-teal-500'}`}
                      title="Затухание">
                      <TrendingDown size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={addSegment} className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 rounded-xl text-sm font-medium transition-colors">
                <Plus size={14} /> Ещё один фрагмент
              </button>
              <button onClick={handleTrim} disabled={isTrimming}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
                {isTrimming ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />}
                {isTrimming ? 'Обработка...' : 'Обрезать'}
              </button>
            </div>
          </section>
        )}

        {/* Block 5: Result */}
        {trimDone && loadedFile && (
          <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Download size={16} className="text-sky-500" />
              Результат обрезки
            </h2>
            <div className="space-y-3 mb-5">
              {segments.map((seg, idx) => (
                <div key={seg.id} className="flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                  <button onClick={() => togglePlay(idx)}
                    className="w-9 h-9 rounded-full bg-teal-500 hover:bg-teal-600 flex items-center justify-center flex-shrink-0 transition-colors">
                    {playing === idx ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Фрагмент {idx + 1}</p>
                    <p className="text-xs text-gray-500">
                      {formatDuration(seg.start)} — {formatDuration(seg.end)} · {seg.end - seg.start} сек
                    </p>
                  </div>
                  {/* Mini waveform */}
                  <div className="flex items-end gap-0.5 h-8">
                    {Array.from({ length: 24 }, (_, i) => {
                      const srcIdx = Math.floor((i / 24) * BARS);
                      const h = waveformData.length > 0 ? Math.max(3, waveformData[srcIdx] * 28) : 6 + Math.abs(Math.sin(i * 0.7) * 10);
                      return <div key={i} className={`w-1 rounded-sm ${playing === idx ? 'bg-teal-400' : 'bg-gray-300'}`} style={{ height: `${h}px` }} />;
                    })}
                  </div>
                  <button onClick={() => handleDownload(idx)}
                    className="flex-shrink-0 p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors" title="Скачать">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => segments.forEach((_, i) => handleDownload(i))}
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm">
              <Download size={16} /> Скачать все фрагменты
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
