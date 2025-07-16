// src/components/SetupModal.jsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const SetupModal = ({ isOpen, onSave, onClose, user, initialSettings, onDeleteAccount }) => {
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('$');
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState('');
  const [numberFormat, setNumberFormat] = useState('comma');
  const [rawBudget, setRawBudget] = useState(1000);
  const [displayBudget, setDisplayBudget] = useState('1000.00');

  useEffect(() => {
    if (isOpen) {
      const initialBudgetValue = initialSettings.budget || 1000;

      setTitle(initialSettings.appTitle || '');
      setRawBudget(initialBudgetValue);
      setDisplayBudget(Number(initialBudgetValue).toFixed(2));
      setNumberFormat(initialSettings.numberFormat || 'comma');

      const standardCurrencies = ['$', '€', '£', '¥', '₹'];
      const initialCurrency = initialSettings.currency || '$';

      if (standardCurrencies.includes(initialCurrency)) {
        setCurrency(initialCurrency);
        setCustomCurrencySymbol('');
      } else {
        setCurrency('custom');
        setCustomCurrencySymbol(initialCurrency);
      }
    }
  }, [isOpen, initialSettings]);

  const handleBudgetChange = (e) => {
    setDisplayBudget(e.target.value);
    const parsedValue = parseFloat(e.target.value);
    setRawBudget(isNaN(parsedValue) ? 0 : parsedValue);
  };

  const handleBudgetBlur = () => {
    setDisplayBudget(rawBudget.toFixed(2));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    let finalCurrency = currency;
    if (currency === 'custom') {
      if (!customCurrencySymbol.trim()) {
        toast.error('Please enter a custom currency symbol.');
        return;
      }
      finalCurrency = customCurrencySymbol.trim();
    }

    if (rawBudget <= 0) {
      toast.error("Budget must be a positive number.");
      return;
    }

    onSave({
      appTitle: title,
      budget: rawBudget,
      currency: finalCurrency,
      numberFormat: numberFormat,
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete your account? This will permanently erase all your data and cannot be undone.')) {
        onDeleteAccount();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Settings</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {initialSettings.isNewUser ? 'Welcome! Please configure your budget to begin.' : 'Update your application settings below.'}
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">App Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Your Budget</label>
            <input type="text" inputMode="decimal" value={displayBudget} onChange={handleBudgetChange} onBlur={handleBudgetBlur} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-4">
            <div className="flex-grow">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
              <div className="relative">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-3 h-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option value="$">Dollar ($)</option>
                  <option value="€">Euro (€)</option>
                  <option value="£">Pound (£)</option>
                  <option value="¥">Yen (¥)</option>
                  <option value="₹">Rupee (₹)</option>
                  <option value="custom">Custom...</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {currency === 'custom' && (
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Custom Currency Symbol</label>
              <input type="text" value={customCurrencySymbol} onChange={(e) => setCustomCurrencySymbol(e.target.value)} placeholder="e.g., CHF" maxLength="5" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          )}

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Number Formatting</label>
            <div className="relative">
                <select value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)} className="w-full p-3 h-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option value="comma">Comma separator (1,000.00)</option>
                  <option value="dot">Dot separator (1.000,00)</option>
                  <option value="none">No separator (1000.00)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
          </div>

          <button type="submit" className="p-3 w-full bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all" >
            Save Settings
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-red-600 dark:text-red-500">Danger Zone</h3>
           <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">Deleting your account is a permanent action.</p>
           <button 
                onClick={handleDelete}
                type="button"
                className="w-full p-2 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all"
            >
                Delete My Account
           </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;