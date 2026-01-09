
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BeeFile, StorageStatus, User, AuthMode, FileCategory } from './types';
import { getMetadata, saveMetadata, saveFileBlob, getFileBlob, deleteFileBlob, formatFileSize, detectCategory } from './services/storageService';
import Background from './components/Background';
import PreviewModal from './components/PreviewModal';
import UploadArea from './components/UploadArea';
import { BeeIcon, FileIcon, TrashIcon, EyeIcon, SearchIcon, PlusIcon, HexagonIcon, SortIcon, LogoutIcon, PlayIcon, ImageIcon, MusicIcon, FolderIcon, ChevronDownIcon } from './components/Icons';

type SortBy = 'name' | 'size' | 'date' | 'category';
type SortOrder = 'asc' | 'desc';

const FileThumbnail: React.FC<{ file: BeeFile }> = ({ file }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (file.category === 'images') {
      getFileBlob(file.blobId).then(blob => {
        url = URL.createObjectURL(blob);
        setThumbnailUrl(url);
      }).catch(err => console.error("Thumbnail error:", err));
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  if (file.category === 'images' && thumbnailUrl) {
    return (
      <div className="w-full h-full relative overflow-hidden">
        <img src={thumbnailUrl} alt={file.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  // Refined fallbacks based on specific types
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isCode = file.type.includes('javascript') || file.type.includes('json') || file.type.includes('html') || file.type.includes('css') || ['.js', '.ts', '.tsx', '.py', '.css', '.html', '.json'].some(ext => file.name.toLowerCase().endsWith(ext));
  const isArchive = ['.zip', '.rar', '.7z', '.tar', '.gz'].some(ext => file.name.toLowerCase().endsWith(ext));

  if (file.category === 'videos') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 group-hover:from-red-100 group-hover:to-orange-100 transition-colors relative">
        <div className="absolute inset-0 opacity-10 pulse-glow" style={{ backgroundImage: 'radial-gradient(circle, #f87171 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
        <PlayIcon className="w-14 h-14 text-red-500/80 group-hover:text-red-600 group-hover:scale-110 transition-all duration-500 z-10 drop-shadow-sm" />
      </div>
    );
  }

  if (isPDF) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 group-hover:from-rose-100 transition-colors">
        <div className="flex flex-col items-center gap-2 z-10">
          <FileIcon className="w-14 h-14 text-rose-500/70 group-hover:scale-110 transition-transform duration-500" />
          <span className="text-[10px] font-black text-rose-400 tracking-widest uppercase bg-white px-2 py-0.5 rounded shadow-sm">PDF</span>
        </div>
      </div>
    );
  }

  if (file.category === 'documents') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 transition-colors">
        <FileIcon className="w-14 h-14 text-blue-500/70 group-hover:scale-110 transition-transform duration-500 z-10" />
      </div>
    );
  }

  if (file.type.startsWith('audio/') || file.category === 'others' && ['.mp3', '.wav', '.m4a'].some(ext => file.name.toLowerCase().endsWith(ext))) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 group-hover:from-indigo-100 transition-colors relative">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg, #818cf8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <MusicIcon className="w-14 h-14 text-indigo-500/70 group-hover:scale-110 transition-transform duration-500 z-10" />
      </div>
    );
  }

  if (isCode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-50 group-hover:from-emerald-100 transition-colors">
        <div className="text-emerald-500/70 font-mono text-3xl font-black group-hover:scale-125 transition-transform duration-500 z-10">{'</>'}</div>
      </div>
    );
  }

  if (isArchive) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 group-hover:from-amber-100 transition-colors">
        <FolderIcon className="w-14 h-14 text-amber-500/70 group-hover:scale-110 transition-transform duration-500 z-10" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 group-hover:from-amber-50 transition-colors">
      <HexagonIcon className="w-14 h-14 text-slate-200 group-hover:text-amber-500/30 group-hover:scale-110 transition-all duration-500 z-10" />
    </div>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Hive...');
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('landing');
  const [files, setFiles] = useState<BeeFile[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<FileCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [uploadStatus, setUploadStatus] = useState<StorageStatus>(StorageStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<BeeFile | null>(null);
  const [globalDrag, setGlobalDrag] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const loadingMessages = [
    'Waking up the workers...',
    'Polishing the honeycomb...',
    'Calibrating lattice sectors...',
    'Syncing with the swarm...',
    'Preparing digital nectar...',
    'Securing the hive walls...',
    'Honey flow optimized!'
  ];

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 12;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          const storedUser = localStorage.getItem('bee_user');
          if (storedUser) {
            const u = JSON.parse(storedUser);
            setUser(u);
            setFiles(getMetadata().filter(f => f.ownerId === u.id));
          }
          setLoading(false);
        }, 800);
      }
      setLoadingProgress(progress);
      setLoadingMessage(loadingMessages[Math.floor((progress / 100) * (loadingMessages.length - 1))]);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  const changeAuthMode = (mode: AuthMode) => {
    setTransitioning(true);
    setTimeout(() => {
      setAuthMode(mode);
      clearForm();
      setTransitioning(false);
    }, 300);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = JSON.parse(localStorage.getItem('bee_users') || '[]');
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    if (foundUser) {
      performLogin(foundUser);
    } else {
      setError('Access denied. Lattice credentials mismatch.');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = JSON.parse(localStorage.getItem('bee_users') || '[]');
    if (users.some((u: any) => u.email === email)) {
      setError('Identity already verified in this sector.');
      return;
    }
    const newUser = { id: Math.random().toString(36).substring(2, 9), email, name, password };
    localStorage.setItem('bee_users', JSON.stringify([...users, newUser]));
    performLogin(newUser);
  };

  const performLogin = (u: any) => {
    setTransitioning(true);
    setTimeout(() => {
      const sessionUser = { id: u.id, email: u.email, name: u.name };
      localStorage.setItem('bee_user', JSON.stringify(sessionUser));
      setUser(sessionUser);
      setFiles(getMetadata().filter(f => f.ownerId === u.id));
      setTransitioning(false);
      clearForm();
    }, 400);
  };

  const handleLogout = () => {
    setTransitioning(true);
    setTimeout(() => {
      localStorage.removeItem('bee_user');
      setUser(null);
      setFiles([]);
      setAuthMode('landing');
      setTransitioning(false);
    }, 400);
  };

  const handleUpload = async (fileList: FileList) => {
    if (!user) return;
    setUploadStatus(StorageStatus.UPLOADING);
    const newFiles: BeeFile[] = [];
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.size > 300 * 1024 * 1024) continue;
        const id = Math.random().toString(36).substring(7);
        const beeFile: BeeFile = {
          id,
          blobId: `blob_${id}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          lastModified: file.lastModified,
          ownerId: user.id,
          category: detectCategory(file.type || '')
        };
        await saveFileBlob(beeFile.blobId, file);
        newFiles.push(beeFile);
      }
      const updatedMetadata = [...getMetadata(), ...newFiles];
      saveMetadata(updatedMetadata);
      setFiles(prev => [...prev, ...newFiles]);
      setUploadStatus(StorageStatus.SUCCESS);
      setTimeout(() => setUploadStatus(StorageStatus.IDLE), 3000);
    } catch (err) {
      console.error(err);
      setUploadStatus(StorageStatus.ERROR);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eject this entry from the Hive?')) return;
    const fileToDelete = files.find(f => f.id === id);
    if (fileToDelete) {
      await deleteFileBlob(fileToDelete.blobId);
      const updatedFiles = files.filter(f => f.id !== id);
      setFiles(updatedFiles);
      const allMetadata = getMetadata();
      saveMetadata(allMetadata.filter(f => f.id !== id));
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (user && !globalDrag) setGlobalDrag(true);
  };
  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget === null) setGlobalDrag(false);
  };
  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGlobalDrag(false);
    if (user && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const filteredFiles = useMemo(() => {
    let result = files.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || f.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') comp = a.name.localeCompare(b.name);
      else if (sortBy === 'size') comp = a.size - b.size;
      else if (sortBy === 'date') comp = a.lastModified - b.lastModified;
      else if (sortBy === 'category') comp = a.category.localeCompare(b.category);
      return sortOrder === 'asc' ? comp : -comp;
    });
    return result;
  }, [files, search, activeCategory, sortBy, sortOrder]);

  const storageUsage = useMemo(() => {
    const total = files.reduce((acc, f) => acc + f.size, 0);
    const quota = 1024 * 1024 * 1024 * 2;
    return {
      total: formatFileSize(total),
      percent: Math.min((total / quota) * 100, 100).toFixed(1)
    };
  }, [files]);

  const transitionClass = transitioning ? 'opacity-0 scale-98 blur-sm' : 'opacity-100 scale-100 blur-0';

  const categories: { id: FileCategory, icon: React.ReactNode, label: string }[] = [
    { id: 'all', icon: <HexagonIcon className="w-3.5 h-3.5" />, label: 'All' },
    { id: 'images', icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Images' },
    { id: 'videos', icon: <PlayIcon className="w-3.5 h-3.5" />, label: 'Videos' },
    { id: 'documents', icon: <FileIcon className="w-3.5 h-3.5" />, label: 'Docs' },
    { id: 'others', icon: <FolderIcon className="w-3.5 h-3.5" />, label: 'Misc' },
  ];

  const sortOptions: { id: SortBy, label: string }[] = [
    { id: 'date', label: 'Recent' },
    { id: 'name', label: 'Name' },
    { id: 'size', label: 'Size' },
    { id: 'category', label: 'Type' },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center overflow-hidden">
        <Background />
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 bg-amber-400 rounded-full opacity-30 animate-[float_10s_infinite]"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${5 + Math.random() * 5}s`
              }}
            />
          ))}
        </div>
        <div className="relative flex flex-col items-center max-w-sm w-full">
          <div className="relative mb-16 group">
            <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-[60px] animate-pulse scale-150"></div>
            <div className="relative z-10 w-32 h-36 bg-slate-100 flex items-center justify-center shadow-2xl transition-all duration-700"
                 style={{ 
                   clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                   transform: `rotate(${loadingProgress * 0.36}deg)`
                 }}>
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 transition-all duration-500 ease-out"
                style={{ height: `${loadingProgress}%`, filter: 'drop-shadow(0 0 10px rgba(217, 119, 6, 0.5))' }} />
              <div className="relative z-20 transition-transform duration-300"
                   style={{ transform: `rotate(-${loadingProgress * 0.36}deg)` }}>
                <BeeIcon className={`w-12 h-12 transition-all duration-500 ${loadingProgress > 50 ? 'text-white' : 'text-amber-600'}`} />
              </div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000"
                style={{ opacity: loadingProgress > (i + 1) * 25 ? 1 : 0, transform: `translate(-50%, -50%) rotate(${loadingProgress * 2 + (i * 120)}deg) translateX(80px)` }}>
                <div className="animate-[buzz_0.3s_infinite]"><BeeIcon className="w-6 h-6 text-amber-500" /></div>
              </div>
            ))}
          </div>
          <div className="w-full px-12 space-y-6">
             <div className="flex flex-col items-center space-y-2 text-center">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Bee<span className="text-amber-600">Store</span></h1>
                <div className="h-4 overflow-hidden">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em] animate-[slideUp_0.5s_ease-out]">{loadingMessage}</p>
                </div>
             </div>
             <div className="flex items-center justify-between font-mono text-[9px] text-slate-300 uppercase tracking-widest px-2">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                   <span>Syncing Lattice</span>
                </div>
                <span>{Math.floor(loadingProgress)}%</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col bg-[#fdfdfd] text-slate-900 transition-all duration-500 ${transitionClass}`}>
        <Background />
        <nav className="glass-effect sticky top-0 z-50 px-8 py-4 flex items-center justify-between border-b border-amber-500/10">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => changeAuthMode('landing')}>
            <div className="bg-amber-500 p-2 rounded-lg text-white shadow-lg group-hover:rotate-12 transition-transform"><BeeIcon className="w-5 h-5" /></div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900">Bee<span className="text-amber-600">Store</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => changeAuthMode('login')} className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-amber-600 transition-colors">Login</button>
            <button onClick={() => changeAuthMode('signup')} className="px-6 py-2.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20">Sign Up</button>
          </div>
        </nav>
        <main className="flex-1 flex items-center justify-center p-6">
          {authMode === 'landing' ? (
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-8">
              <div className="space-y-8 animate-[slideUp_0.8s_ease-out]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 text-[9px] font-black uppercase tracking-[0.2em]">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                    Secure Honeycomb Storage
                  </div>
                  <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 uppercase leading-[0.9]">Build Your<br/><span className="text-amber-600">Secure Hive</span></h1>
                  <p className="text-lg lg:text-xl text-slate-400 font-light leading-snug max-w-lg">High-performance <span className="text-slate-900 font-bold italic border-b border-amber-500/20">permanent vault</span> for your digital assets. Accessible anywhere.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => changeAuthMode('signup')} className="px-8 py-4 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-700 hover:scale-105 transition-all active:scale-95 text-lg shadow-2xl shadow-amber-600/30">Initialize Hive</button>
                  <button onClick={() => changeAuthMode('login')} className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 hover:scale-105 transition-all active:scale-95 text-lg border-2 border-slate-100 shadow-sm">Access Swarm</button>
                </div>
                <div className="flex flex-wrap gap-8 pt-6 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900">300 MB</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">File Limit</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900">Unlimited</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Permanence</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900">Gemini</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Powered AI</span>
                  </div>
                </div>
              </div>
              <div className="relative hidden lg:flex h-[500px] w-full items-center justify-center">
                 <div className="absolute inset-0 bg-amber-500/5 rounded-[4rem] blur-3xl animate-pulse"></div>
                 <div className="relative z-10 grid grid-cols-3 gap-6">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="w-24 h-28 bg-white border border-slate-100 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center group hover:scale-110 hover:border-amber-500/30 transition-all duration-500 ease-out"
                        style={{ animation: `float ${6 + (i % 3)}s ease-in-out infinite ${i * 0.4}s` }}>
                         <HexagonIcon className="w-8 h-8 text-slate-50 group-hover:text-amber-500/20 transition-colors" />
                         {i === 4 && <BeeIcon className="w-8 h-8 text-amber-500 absolute" />}
                      </div>
                    ))}
                 </div>
                 <div className="absolute top-8 right-0 p-4 bg-white rounded-[1.5rem] shadow-xl border border-amber-50 font-black text-[9px] uppercase tracking-[0.2em] text-amber-600 animate-bounce">Permanent Hive Syncing</div>
                 <div className="absolute bottom-8 left-0 p-5 bg-slate-900 text-white rounded-[2rem] shadow-2xl border border-slate-800 font-black text-[9px] uppercase tracking-widest animate-pulse flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center"><BeeIcon className="w-4 h-4" /></div>
                    Lattice Protocol v2.6
                 </div>
              </div>
            </div>
          ) : (
            <div className="max-w-sm w-full p-8 glass-effect rounded-[3rem] border border-amber-500/10 shadow-2xl bg-white relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
               <div className="relative z-10 flex flex-col items-center mb-8 text-center">
                  <div className="p-4 bg-amber-500 rounded-[1.5rem] text-white mb-6 shadow-2xl shadow-amber-500/30 rotate-12 hover:rotate-0 transition-transform cursor-pointer"><BeeIcon className="w-10 h-10" /></div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{authMode === 'login' ? 'Sync Identity' : 'Hive Initialization'}</h1>
                  <p className="text-slate-400 text-sm mt-1 italic tracking-wide">Secure credentials required.</p>
               </div>
               <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
                  {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black text-center rounded-xl uppercase tracking-widest animate-shake border border-red-100">{error}</div>}
                  {authMode === 'signup' && (
                    <input type="text" placeholder="Identity Nickname" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-bold text-base" />
                  )}
                  <input type="email" placeholder="Hive Channel (Email)" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-bold text-base" />
                  <input type="password" placeholder="Lattice Key (Password)" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-bold text-base" />
                  <button type="submit" className="w-full bg-amber-600 text-white font-black py-4 rounded-xl hover:bg-amber-700 transition-all shadow-xl text-lg uppercase tracking-tighter active:scale-95">{authMode === 'login' ? 'Authenticate' : 'Start Swarming'}</button>
               </form>
               <button onClick={() => changeAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-8 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-amber-600 transition-colors">{authMode === 'login' ? "New Identity? Initialize Hive →" : "Already Verified? Access Sector →"}</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 relative" onDragOver={handleGlobalDragOver} onDragLeave={handleGlobalDragLeave} onDrop={handleGlobalDrop}>
      <Background />
      {globalDrag && (
        <div className="fixed inset-0 z-[60] bg-amber-500/10 backdrop-blur-2xl flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out]">
          <div className="w-64 h-64 border-2 border-dashed border-amber-500 rounded-[4rem] flex flex-col items-center justify-center p-8 bg-white/90 shadow-2xl scale-110 animate-pulse">
            <PlusIcon className="w-20 h-20 text-amber-500 mb-6" />
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Release to Hive</h2>
            <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold italic">Pollinating your vault...</p>
          </div>
        </div>
      )}
      <header className="glass-effect sticky top-0 z-40 px-8 py-4 flex items-center justify-between border-b border-amber-500/10">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="bg-amber-500 p-2 rounded-xl text-white shadow-xl group-hover:rotate-12 transition-transform"><BeeIcon className="w-5 h-5" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900 leading-none">Bee <span className="text-amber-600">Store</span></h1>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sector Access Granted</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-base font-black text-slate-900 leading-none">{user.name}</span>
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mt-1">Lattice Status: Active</span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100 shadow-sm" title="Leave Sector"><LogoutIcon className="w-5 h-5" /></button>
        </div>
      </header>
      <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-10">
          <div className="space-y-4">
            <h2 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9] animate-[slideUp_0.5s_ease-out]">Your<br/><span className="text-amber-600">Honeycomb</span></h2>
            <div className="flex gap-3">
               <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">2.0 GB Allotment</div>
               <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Encrypted Sync</div>
            </div>
          </div>
          <div className="glass-effect p-8 rounded-[3rem] bg-white border-amber-500/10 min-w-[320px] space-y-4 shadow-xl">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hive Utilization</span>
              <span className="text-2xl font-black text-slate-900">{storageUsage.total}</span>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
               <div className="h-full bg-amber-500 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${storageUsage.percent}%` }}></div>
            </div>
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
              <span>{storageUsage.percent}% Filled</span>
              <span>2.0 GB Cap</span>
            </div>
          </div>
        </div>
        <UploadArea onUpload={handleUpload} status={uploadStatus} />
        <div className="space-y-10">
           <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 border-b-2 border-slate-100 pb-12">
             <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-50/50 backdrop-blur-sm p-1.5 rounded-[2rem] border border-slate-100 shadow-inner">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} 
                      className={`group relative flex items-center gap-2.5 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeCategory === cat.id ? 'bg-amber-600 text-white shadow-xl shadow-amber-600/30' : 'text-slate-400 hover:text-slate-900 hover:bg-white'}`}>
                      <span className={`${activeCategory === cat.id ? 'text-white' : 'text-amber-500 group-hover:scale-110 transition-transform'}`}>{cat.icon}</span>
                      {cat.label}
                      {activeCategory === cat.id && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full blur-[2px] animate-pulse"></span>}
                    </button>
                  ))}
                </div>
             </div>
             <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
                <div className="relative" ref={sortRef}>
                  <div className="flex items-center bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-1">
                    <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 pr-3"><SortIcon className="w-3.5 h-3.5" />Sort By</div>
                      <span className="text-[10px] font-black uppercase text-slate-900 min-w-[70px] text-left">{sortOptions.find(o => o.id === sortBy)?.label}</span>
                      <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-3 hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all border-l border-slate-100">
                      <svg className={`w-4 h-4 transform transition-transform duration-500 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                    </button>
                  </div>
                  {isSortOpen && (
                    <div className="absolute top-full left-0 mt-3 w-48 bg-white rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] border border-slate-100 py-3 z-[100] animate-[fadeIn_0.2s_ease-out] overflow-hidden">
                      {sortOptions.map(option => (
                        <button key={option.id} onClick={() => { setSortBy(option.id); setIsSortOpen(false); }}
                          className={`w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${sortBy === option.id ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>{option.label}{sortBy === option.id && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative flex-1 xl:flex-none flex items-center bg-white rounded-2xl border border-slate-200 p-1.5 group focus-within:border-amber-500/40 focus-within:ring-4 focus-within:ring-amber-500/5 transition-all shadow-sm">
                   <div className="w-10 h-10 flex items-center justify-center text-slate-300 group-focus-within:text-amber-500 transition-colors"><SearchIcon className="w-5 h-5" /></div>
                   <input type="text" placeholder="Locate asset in swarm..." value={search} onChange={e => setSearch(e.target.value)} 
                    className="bg-transparent border-none focus:outline-none text-xs font-bold px-2 w-full xl:w-64 placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:tracking-widest" />
                   {search && <button onClick={() => setSearch('')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-900 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                </div>
             </div>
           </div>
           {filteredFiles.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-48 text-center glass-effect rounded-[4rem] border-2 border-dashed border-slate-100 bg-white/50 space-y-8 animate-[fadeIn_1s_ease-out]">
                <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-100 shadow-inner group-hover:scale-105 transition-transform"><HexagonIcon className="w-16 h-16" /></div>
                <div>
                  <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">Sector Vacant</h3>
                  <p className="text-slate-400 text-xs mt-3 uppercase tracking-[0.2em] font-bold italic">Pollinate your vault with assets.</p>
                </div>
                <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="px-8 py-3 bg-amber-100 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-amber-600 hover:text-white transition-all shadow-lg">Upload Now</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredFiles.map(file => (
                  <div key={file.id} onClick={() => setSelectedFile(file)} className="glass-effect group relative rounded-[3rem] p-6 hover:border-amber-500/40 transition-all hover:-translate-y-2 cursor-pointer bg-white border border-slate-50 shadow-sm hover:shadow-xl">
                    <div className="aspect-square bg-slate-50 rounded-[2.5rem] mb-6 flex items-center justify-center overflow-hidden border border-slate-100 relative group-hover:bg-amber-50/50 transition-all duration-700">
                       <FileThumbnail file={file} />
                       <div className="absolute bottom-4 left-4 px-4 py-1.5 bg-white/95 backdrop-blur-xl rounded-2xl text-[9px] font-black text-amber-600 border border-amber-100 shadow-sm uppercase tracking-widest">{file.type.split('/')[1]?.toUpperCase().substring(0, 8) || 'BIN'}</div>
                    </div>
                    <div className="space-y-2">
                       <h3 className="font-bold text-base truncate pr-4 text-slate-900 group-hover:text-amber-600 transition-colors" title={file.name}>{file.name}</h3>
                       <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">{new Date(file.lastModified).toLocaleDateString()}</span>
                       </div>
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col gap-4 opacity-0 translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                      <button onClick={e => { e.stopPropagation(); handleDelete(file.id); }} className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl border border-red-100"><TrashIcon className="w-5 h-5" /></button>
                      <button onClick={e => { e.stopPropagation(); setSelectedFile(file); }} className="p-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all shadow-xl"><EyeIcon className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </main>
      <footer className="p-16 border-t border-slate-100 bg-slate-50/50 text-center space-y-8">
         <div className="flex items-center justify-center gap-4">
            <BeeIcon className="w-6 h-6 text-amber-600 opacity-20" />
            <span className="text-xs font-black text-slate-300 uppercase tracking-[0.6em]">Bee Store Hive Protocol v2.6.5</span>
         </div>
      </footer>
      {selectedFile && <PreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} onDelete={handleDelete} />}
    </div>
  );
};

export default App;
