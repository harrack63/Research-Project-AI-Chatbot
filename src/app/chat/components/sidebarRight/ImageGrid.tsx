import { useState } from 'react';
import Image from 'next/image';

const images = [
  { src: '/sample1.png', title: 'Scan 1', meta: 'Example metadata' },
  { src: '/sample2.png', title: 'Scan 2', meta: 'Example metadata' },
];

export default function ImageGrid() {
  const [focus, setFocus] = useState<number | null>(null);

  return (
    <div className="p-4 grid grid-cols-3 gap-4">
      {images.map((img, i) => (
        <div
          key={i}
          className="relative bg-white rounded-md shadow hover:shadow-lg cursor-pointer overflow-hidden"
          onClick={() => setFocus(i)}
        >
          <div className="relative h-32 w-full">
            <Image
              src={img.src}
              alt={img.title}
              fill
              sizes="(max-width: 768px) 33vw, 160px"
              className="object-cover"
            />
          </div>
          <p className="text-sm text-center p-1">{img.title}</p>

          {/* Expanded overlay */}
          {focus === i && (
            <div
              className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center text-white"
              onClick={() => setFocus(null)}
            >
              <p className="mb-2 font-bold">{img.title}</p>
              <p className="text-xs">{img.meta}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
