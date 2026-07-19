import { useEffect } from 'react'
import { X } from 'lucide-react'

interface VideoModalProps {
  open: boolean
  onClose: () => void
}

const DRIVE_FILE_ID = '1BgHKz3Gso7wg9KoqUPhgNccxe20_n3uN'
const EMBED_SRC = `https://drive.google.com/file/d/${DRIVE_FILE_ID}/preview`

export default function VideoModal({ open, onClose }: VideoModalProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // Unmounting the iframe (rather than just hiding it) is what actually stops
  // playback when the modal closes — a hidden-but-mounted iframe keeps playing.
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="GHC product demo video"
        className="relative w-full max-w-4xl animate-fade-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center text-white/80 transition hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
          <iframe
            src={EMBED_SRC}
            className="h-full w-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            title="GHC product demo"
          />
        </div>
      </div>
    </div>
  )
}
