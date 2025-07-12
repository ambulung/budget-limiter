import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SetupModal = ({ isOpen, onSave, onClose, user, initialSettings }) => {
  // State for form inputs within the modal
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('1000');
  const [currency, setCurrency] = useState('$');
  const [currentIconUrl, setCurrentIconUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  // State for the new number formatting option
  const [numberFormat, setNumberFormat] = useState('comma');

  // When the modal opens, populate the form with existing settings or defaults
  useEffect(() => {
    if (isOpen) {
      setTitle(initialSettings.appTitle || '');
      setBudget(initialSettings.budget?.toString() || '1000');
      setCurrency(initialSettings.currency || '$');
      setCurrentIconUrl(initialSettings.appIcon || '');
      setNumberFormat(initialSettings.numberFormat || 'comma');
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  // Handler for direct icon upload
  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error("Please select an image file.");

    setIsUploading(true);
    const uploadToast = toast.loading("Uploading icon...");
    const storageRef = ref(storage, `icons/${user.uid}/profile`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setCurrentIconUrl(downloadURL); // Update the icon URL in state immediately for preview
      toast.success("Icon updated! Click 'Save' to apply.", { id: uploadToast });
    } catch (error) {
      toast.error("Failed to upload icon.", { id: uploadToast });
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave({
      appTitle: title,
      budget: Number(budget),
      currency: currency,
      appIcon: currentIconUrl,
      numberFormat: numberFormat, // Pass the new setting back on save
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Upload Icon</label>
            <input 
              type="file"
              onChange={handleIconUpload}
              accept="image/png, image/jpeg, image/gif"
              disabled={isUploading}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600 cursor-pointer"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-grow">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Your Budget</label>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-1/3">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
              <div className="relative">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-3 h-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="¥">JPY (¥)</option>
                  <option value="B$">BND (B$)</option>
                  <option value="₹">INR (₹)</option>
                  <option value="RM">MYR (RM)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
          
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

          <button type="submit" className="p-3 w-full bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all" disabled={isUploading}>
            {isUploading ? "Uploading..." : "Save and Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupModal;