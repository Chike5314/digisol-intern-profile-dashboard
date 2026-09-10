import { Modal } from "./Modal";

export function ConfirmDialog({ title = "Are you sure?", message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-[var(--ink)]/70">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm font-medium text-[var(--ink)]/70 hover:bg-[var(--paper)] transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[#B5432F] hover:bg-[#9c3826] transition"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
