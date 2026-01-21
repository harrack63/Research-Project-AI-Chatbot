// app/chat/components/sidebarRight/SidebarRight.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, User, BarChart3 } from "lucide-react";
import UserPersona from "./UserPersona";
import ImageGraphs from "./ImageGraphs";

type SidebarRightProps = {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
};

export default function SidebarRight({
  isOpen,
  onToggle,
  width,
  onWidthChange,
}: SidebarRightProps) {
  const [activeTab, setActiveTab] = useState<"persona" | "data">("persona");
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * 0.6;
      const minWidth = 300;
      onWidthChange(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  const showDragHandle = !isOpen;

  return (
    <>
      {/* Drag handle when sidebar is closed */}
      {showDragHandle && (
        <div className="fixed right-2 top-4 z-40">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle();
            }}
            className="bg-blue-600 hover:bg-blue-500 transition-all p-1.5 rounded-md shadow-md flex items-center justify-center"
            title="Expand sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className={`h-screen bg-slate-900 border-l border-slate-800 flex flex-col relative transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ width: `${width}px` }}
        >
          {/* Collapse button - top right */}
          <div className="absolute right-2 top-4 z-40">
            <button
              onClick={onToggle}
              className="bg-slate-800 text-white p-1.5 rounded-md shadow hover:bg-slate-700 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Drag resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/60 transition-colors z-10"
            onMouseDown={handleMouseDown}
          />

          {/* Header with tabs */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-white">My Health Persona</h2>
              {/* Toggle switch placeholder - can be added later if needed */}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("persona")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === "persona"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Persona
              </button>
              <button
                onClick={() => setActiveTab("data")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === "data"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Data
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "persona" ? <UserPersona /> : <ImageGraphs />}
          </div>
        </div>
      )}
    </>
  );
}
