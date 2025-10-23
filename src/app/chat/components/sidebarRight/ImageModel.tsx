// app/chat/components/sidebarRight/ImageModal.tsx
import type { ChatImage } from "~/lib/types";
import { X } from "lucide-react";
import Image from "next/image";

type ImageModalProps = {
  image: ChatImage;
  onClose: () => void;
};

export default function ImageModal({ image, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-xl w-[95vw] h-[90vh] max-w-7xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left image area */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center">
          <Image
            src={image.url}
            alt={image.title}
            fill
            className="object-contain px-4 py-4"
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
          />
        </div>

        {/* Right panel */}
        <div className="w-full md:w-[28rem] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-700 flex flex-col">
          {/* Header row (title + dismiss) */}
          <div className="flex items-center justify-between pt-4 px-4 border-slate-700">
            <h3 className="text-lg font-semibold text-white truncate pr-2">
              {image.title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Description content */}
          <div className="flex-1 overflow-y-auto px-4 pt-2">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {image.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}