'use client';
import { useState } from 'react';
import SidebarLeft from '~/app/components/sidebarLeft/SidebarLeft';
import SidebarRight from '~/app/components/sidebarRight/SidebarRight';
import ChatArea from '~/app/components/chat/ChatArea';

export default function HomePage() {
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);

  const toggleLeft = () => setShowLeft((p) => !p);
  const toggleRight = () => {
    setShowRight((p) => {
      const newValue = !p;
      if (newValue) setShowLeft(false);
      return newValue;
    });
  };

  return (
    <div className="flex min-h-screen bg-blue-950">
      {/* Left sidebar - proper width transition */}
      <div className={`transition-all duration-300 ${showLeft ? 'w-64' : 'w-0'} overflow-hidden`}>
        <SidebarLeft isOpen={showLeft} onToggle={toggleLeft} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <ChatArea />
      </main>

      {/* Right sidebar */}
      {/* {showRight && <SidebarRight  />} */}
    </div>
  );
}