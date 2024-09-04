import React, { useState } from 'react';

function ArchiveConfirmationModal({ onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-red-600">WARNING: Irreversible Action</h2>
        <p className="mb-4">
          You are about to archive all current players and start a new page. This action is irreversible.
          All current player data will be moved to the archive and removed from the active list.
        </p>
        <p className="mb-4 font-bold">
          Are you absolutely sure you want to proceed?
        </p>
        <input
          type="password"
          placeholder="Enter your password to confirm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4"
        />
        <input
          type="text"
          placeholder="Reason for archiving (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4"
        />
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="bg-gray-300 text-black px-4 py-2 rounded mr-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(password, reason)}
            className="bg-red-600 text-white px-4 py-2 rounded"
            disabled={!password}
          >
            Confirm Archive
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveConfirmationModal;