import React from 'react'

interface ImagePreviewProps {
  src: string
  name: string
  onClose: () => void
}

export function ImagePreview({ src, name, onClose }: ImagePreviewProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onMouseDown={onClose}
    >
      <div
        className="relative bg-jarvis-panel border border-jarvis-border rounded-xl shadow-2xl overflow-hidden"
        style={{ maxWidth: '420px', maxHeight: '400px' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onMouseDown={e => { e.stopPropagation(); onClose() }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
          title="Close"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Image */}
        <img
          src={src}
          alt={name}
          className="w-full max-h-[340px] object-contain"
        />

        {/* Filename */}
        <div className="px-4 py-2.5 border-t border-jarvis-border text-center">
          <p className="text-jarvis-text text-xs truncate">{name}</p>
        </div>
      </div>
    </div>
  )
}
