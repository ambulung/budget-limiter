// src/components/EditExpenseModal.js

import React, { useState, useEffect } from 'react';

const EditExpenseModal = ({ isOpen, onClose, onSave, expense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // When the 'expense' prop changes (i.e., when the modal is opened for a new item),
  // update the form fields with that expense's data.
  useEffect(() => {
    if (expense) {
      setDescription(expense.description || '');
      setAmount(expense.amount || '');
      setNotes(expense.notes || '');
    }
  }, [expense]);

  if (!isOpen) return null;

  const handleSave = () => {
    const amountNumber = Number(amount);
    if (!description || isNaN(amountNumber) || amountNumber <= 0) {
      alert("Please enter a valid description and amount."); // Or use a toast
      return;
    }
    onSave({
      ...expense, // Keep the original id and other properties
      description,
      amount: amountNumber,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md m-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Edit Expense</h2>
        <div className="flex flex-col gap-4">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows="3"
            className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditExpenseModal;