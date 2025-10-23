// app/chat/components/sidebarRight/ImageModal.tsx
import type { ChatImage } from '~/lib/types';
import { X } from 'lucide-react';
import Image from "next/image";

type ImageModalProps = {
  image: ChatImage;
  onClose: () => void;
};

export default function ImageModal({ image, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-xl max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{image.title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6">
          <Image
            src={image.url}
            alt={image.title}
            className="w-full rounded-lg mb-4"
          />
          <p className="text-slate-300 text-sm leading-relaxed">
            {image.description}
          </p>
        </div>
      </div>
    </div>
  );
}