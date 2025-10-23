type DeleteModalProps = {
  isOpen: boolean;
  chatname: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteModal({
  isOpen,
  chatname,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-slate-900 rounded-xl p-6 max-w-md mx-4 border border-slate-800 animate-scale-in origin-center">
        <h2 className="text-xl font-semibold text-white mb-3">Delete Thread</h2>
        <p className="text-slate-300 text-sm mb-6">
          Are you sure you want to delete &quot;{chatname}&quot;? This action cannot be
          undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}