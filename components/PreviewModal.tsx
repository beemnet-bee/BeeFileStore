
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BeeFile } from '../types';
import { getFileBlob, formatFileSize } from '../services/storageService';
import { getFileInsight } from '../services/geminiService';
import { TrashIcon, ShareIcon, EyeIcon, HexagonIcon, MusicIcon, PlayIcon, PauseIcon, VolumeIcon, BeeIcon } from './Icons';

interface PreviewModalProps {
  file: BeeFile;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose, onDelete }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [insight, setInsight] = useState<string>("Analyzing asset lattice structure...");
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  
  // Custom Media State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isText = useMemo(() => {
    const textTypes = [
      'text/plain', 'text/markdown', 'application/json', 'application/javascript', 
      'text/javascript', 'text/css', 'text/html', 'application/xml', 'text/csv'
    ];
    const extensions = ['.txt', '.md', '.js', '.json', '.css', '.html', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.xml', '.yaml', '.yml'];
    return textTypes.includes(file.type) || extensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }, [file]);

  const isAudio = useMemo(() => {
    return file.type.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].some(ext => file.name.toLowerCase().endsWith(ext));
  }, [file]);

  const isVideo = useMemo(() => {
    return file.type.startsWith('video/') || ['.mp4', '.webm', '.ogg', '.mov'].some(ext => file.name.toLowerCase().endsWith(ext));
  }, [file]);

  const isPDF = useMemo(() => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }, [file]);

  useEffect(() => {
    let currentUrl: string | null = null;
    const loadFile = async () => {
      try {
        const blob = await getFileBlob(file.blobId);
        let blobToUse = blob;
        
        if (isPDF) {
          blobToUse = new Blob([blob], { type: 'application/pdf' });
        } else if (file.type) {
          blobToUse = new Blob([blob], { type: file.type });
        }
        
        currentUrl = URL.createObjectURL(blobToUse);
        setUrl(currentUrl);

        if (isText) {
          const text = await blob.text();
          setTextContent(text);
        }

        let snippet = "";
        if (isText) {
          snippet = (await blob.slice(0, 1000).text()).substring(0, 1000);
        }
        const aiResponse = await getFileInsight(file.name, file.type, snippet);
        setInsight(aiResponse);
        setLoadingInsight(false);
      } catch (err) {
        console.error("Failed to load preview:", err);
        setInsight("The lattice failed to decipher this asset. It remains secure.");
        setLoadingInsight(false);
      }
    };

    loadFile();
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [file, isText, isPDF]);

  const handleShare = () => {
    const shareText = `🐝 Shared from Bee Store Hive: ${file.name} (${formatFileSize(file.size)})`;
    navigator.clipboard.writeText(shareText);
    alert('Access token copied to clipboard.');
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const media = audioRef.current || videoRef.current;
    if (media) {
      if (isPlaying) media.pause();
      else media.play();
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    const media = audioRef.current || videoRef.current;
    if (media) setCurrentTime(media.currentTime);
  };

  const onLoadedMetadata = () => {
    const media = audioRef.current || videoRef.current;
    if (media) setDuration(media.duration);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = audioRef.current || videoRef.current;
    if (media) {
      const time = parseFloat(e.target.value);
      media.currentTime = time;
      setCurrentTime(time);
    }
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = audioRef.current || videoRef.current;
    const val = parseFloat(e.target.value);
    if (media) {
      media.volume = val;
      setVolume(val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/80 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out]">
      <div className="glass-effect w-full max-w-6xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[92vh] border border-amber-500/20 shadow-[0_50px_150px_-30px_rgba(0,0,0,0.6)] bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl text-white shadow-lg transition-transform hover:scale-110 ${isAudio ? 'bg-indigo-500' : isVideo ? 'bg-red-500' : 'bg-amber-500'}`}>
               {isAudio ? <MusicIcon className="w-5 h-5" /> : isVideo ? <PlayIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base truncate max-w-[200px] md:max-w-md text-slate-900 tracking-tight uppercase leading-none mb-1" title={file.name}>{file.name}</h3>
              <p className="text-[9px] text-amber-600 font-black tracking-[0.2em] uppercase">{formatFileSize(file.size)} • {file.type || 'Lattice Asset'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-slate-100 hover:rotate-90">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Body - Responsive Scrolling for Stacked Layout */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden bg-slate-50/30 flex flex-col lg:flex-row p-4 md:p-6 gap-6 min-h-0 custom-scrollbar">
          {/* Main Viewer Area */}
          <div className="flex-1 min-h-[400px] lg:min-h-0 flex items-center justify-center bg-slate-900/5 rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-inner relative group bg-white">
            {file.type.startsWith('image/') ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img src={url || ''} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-700 hover:scale-[1.02]" />
              </div>
            ) : isPDF ? (
              <div className="w-full h-full bg-slate-200">
                <object 
                  data={url || ''} 
                  type="application/pdf" 
                  className="w-full h-full"
                >
                  <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                    <p className="text-slate-500 font-bold mb-4">PDF viewer not available in this browser.</p>
                    <a href={url || ''} download={file.name} className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg">Download to View</a>
                  </div>
                </object>
              </div>
            ) : isVideo ? (
              <div className="w-full h-full bg-black flex flex-col items-center justify-center relative overflow-hidden group">
                <video 
                  ref={videoRef}
                  src={url || ''} 
                  className="w-full h-full max-h-full object-contain"
                  onTimeUpdate={onTimeUpdate}
                  onLoadedMetadata={onLoadedMetadata}
                  onClick={togglePlay}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Custom Overlay Controls for Video */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
                   <input 
                      type="range" 
                      min="0" 
                      max={duration || 0} 
                      value={currentTime} 
                      onChange={onSeek}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-500"
                   />
                   <div className="flex items-center justify-between text-white text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="hover:scale-110 transition-transform">
                          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <VolumeIcon className="w-4 h-4" />
                        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={onVolumeChange} className="w-20 h-1 accent-amber-500" />
                      </div>
                   </div>
                </div>
              </div>
            ) : isAudio ? (
              <div className="flex flex-col items-center justify-center w-full p-8 md:p-12 space-y-6 bg-gradient-to-br from-indigo-50/50 to-white h-full">
                 <div className={`w-28 h-28 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center border border-indigo-100 transition-all duration-500 ${isPlaying ? 'animate-[buzz_0.5s_infinite]' : 'animate-[float_4s_infinite]'}`}>
                    <MusicIcon className={`w-12 h-12 ${isPlaying ? 'text-amber-500' : 'text-indigo-500'}`} />
                 </div>
                 <div className="text-center space-y-2">
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter max-w-sm truncate">{file.name}</h4>
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] font-bold">Lattice Audio Stream Active</p>
                 </div>
                 <div className="w-full max-w-md bg-white/80 p-6 rounded-[2.5rem] shadow-2xl border border-indigo-50 space-y-4">
                   <audio 
                      ref={audioRef} 
                      src={url || ''} 
                      onTimeUpdate={onTimeUpdate}
                      onLoadedMetadata={onLoadedMetadata}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="hidden" 
                   />
                   
                   <div className="flex flex-col gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max={duration || 0} 
                        value={currentTime} 
                        onChange={onSeek}
                        className="w-full h-1.5 bg-indigo-100 rounded-full appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[9px] font-black text-slate-400 tracking-widest uppercase">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                   </div>

                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={togglePlay} 
                          className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
                        >
                          {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <VolumeIcon className="w-4 h-4 text-indigo-300" />
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          value={volume} 
                          onChange={onVolumeChange} 
                          className="w-24 h-1 bg-indigo-50 rounded-full accent-indigo-400" 
                        />
                      </div>
                   </div>
                 </div>
              </div>
            ) : isText ? (
              <div className="w-full h-full p-6 overflow-auto custom-scrollbar font-mono text-[11px] text-slate-700 bg-white/80 leading-relaxed text-left selection:bg-amber-200 selection:text-amber-900">
                <pre className="whitespace-pre-wrap break-all">{textContent || 'Initializing byte decryption...'}</pre>
              </div>
            ) : (
              <div className="text-center p-12 max-w-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-100 mx-auto mb-6 shadow-inner">
                   <HexagonIcon className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-400 uppercase tracking-tighter mb-2">Binary Data</h4>
                <p className="text-xs text-slate-400 font-medium mb-8 italic">Direct rendering unavailable for this lattice asset.</p>
                <a href={url || ''} download={file.name} className="inline-flex items-center gap-3 px-6 py-3.5 bg-amber-600 text-white rounded-xl font-black text-xs hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20 uppercase tracking-widest">
                  Export Pollen
                </a>
              </div>
            )}
          </div>

          {/* Sidebar Section */}
          <div className="lg:w-72 flex flex-col gap-5 shrink-0 min-h-0">
            <div className="bg-white border border-amber-500/10 p-6 rounded-[2rem] relative overflow-hidden flex-1 shadow-sm flex flex-col group hover:border-amber-500/30 transition-all min-h-[250px] lg:min-h-0">
              <div className="flex items-center gap-2.5 mb-4 shrink-0">
                <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-amber-200 flex items-center gap-2">
                   {loadingInsight && <span className="w-1 h-1 bg-amber-500 rounded-full animate-ping"></span>}
                   BeeAI Insight
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-sm leading-relaxed text-slate-600 font-light italic">
                  "{insight}"
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between shrink-0">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Lattice Confidence</span>
                    <div className="w-16 h-1 bg-slate-100 rounded-full mt-1"><div className="w-3/4 h-full bg-amber-400 rounded-full shadow-[0_0_5px_rgba(251,191,36,0.5)]"></div></div>
                 </div>
                 <BeeIcon className="w-5 h-5 text-amber-500 opacity-20" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <button onClick={handleShare} className="flex-1 py-3.5 bg-slate-900 text-white font-black rounded-xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest text-[9px] shadow-lg flex items-center justify-center gap-2">
                <ShareIcon className="w-3.5 h-3.5" />
                Share
              </button>
              <button 
                onClick={() => { onDelete(file.id); onClose(); }} 
                className="flex-1 py-3.5 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-600 hover:text-white active:scale-95 transition-all border border-red-100 uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Eject
              </button>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-black hover:text-slate-900 transition-colors uppercase tracking-widest text-[9px] hover:bg-slate-50 rounded-lg">
            Dismiss
          </button>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[8px] font-black text-slate-300 uppercase tracking-widest">Protected Hive Access Protocol</span>
            <a href={url || ''} download={file.name} className="px-8 py-3.5 bg-amber-600 text-white rounded-2xl font-black text-sm hover:bg-amber-700 hover:scale-105 transition-all active:scale-95 shadow-[0_15px_40px_-10px_rgba(217,119,6,0.4)] uppercase tracking-tight flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </a>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { 
          width: 6px; 
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: #f8fafc; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #fbbf24; 
          border-radius: 10px; 
          border: 1px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: #d97706; 
        }
      `}</style>
    </div>
  );
};

export default PreviewModal;
