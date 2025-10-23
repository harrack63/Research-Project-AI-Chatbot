type Props = {
  className?: string;
  toggle: () => void;
};

export default function SidebarRight({ className }: Props) {
  return (
    <aside className={`${className} bg-white border-l border-gray-200 p-4`}>
      <h2 className="font-bold mb-2 text-lg text-primary">Chatbot Response</h2>
      <p className="text-sm">
        Details will appear here — model metadata, related papers, or reference outputs.
      </p>
    </aside>
  );
}