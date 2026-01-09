
import React, { useState, useRef } from 'react';
import { StorageStatus } from '../types';
import { PlusIcon, BeeIcon } from './Icons';

interface UploadAreaProps {
  onUpload: (files: FileList) => Promise<void>;
  status: StorageStatus;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUpload, status }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
    }
  };

  return (
    <div 
      className={`relative group cursor-pointer border-3 border-dashed rounded-[2.5rem] p-10 transition-all duration-500 flex flex-col items-center justify-center text-center
        ${isDragging ? 'border-amber-500 bg-amber-50 scale-[0.99]' : 'border-slate-200 bg-white hover:border-amber-500/40 hover:bg-amber-50/50'}
        ${status === StorageStatus.UPLOADING ? 'pointer-events-none opacity-90' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleChange}
      />
      
      <div className={`mb-5 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-700 shadow-lg ${isDragging ? 'scale-110 rotate-12' : 'group-hover:scale-105'} ${status === StorageStatus.SUCCESS ? 'bg-green-500 shadow-green-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
        {status === StorageStatus.UPLOADING ? (
          <div className="w-6 h-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
        ) : status === StorageStatus.SUCCESS ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <PlusIcon className="w-7 h-7 text-white" />
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
          {status === StorageStatus.UPLOADING ? 'Hiving data...' : status === StorageStatus.SUCCESS ? 'Pollen Secured' : 'Build Your Hive'}
        </h3>
        <p className="text-slate-400 text-sm font-light italic">
          {status === StorageStatus.UPLOADING ? 'Securing bytes...' : 'Drop files or browse the swarm (Max 300MB)'}
        </p>
      </div>

      {status === StorageStatus.UPLOADING && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-50 overflow-hidden rounded-b-[2.3rem]">
          <div className="h-full bg-amber-500 animate-[pollen_1.5s_ease-in-out_infinite] shadow-lg"></div>
        </div>
      )}

      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-8 left-8 animate-buzz"><BeeIcon className="w-5 h-5 text-amber-500/10" /></div>
          <div className="absolute bottom-8 right-8 animate-[buzz_4s_infinite]"><BeeIcon className="w-5 h-5 text-amber-500/10" /></div>
        </div>
      )}

      <style>{`
        @keyframes pollen {
          0% { transform: translateX(-100%); width: 20%; }
          50% { width: 60%; }
          100% { transform: translateX(100%); width: 20%; }
        }
      `}</style>
    </div>
  );
};

export default UploadArea;
