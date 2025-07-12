import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, deleteDoc, query, orderBy, updateDoc } from "firebase/firestore";
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Component Imports
import ThemeToggle from './ThemeToggle'; // Assuming you have this component
import SetupModal from './SetupModal';
import EditExpenseModal from './EditExpenseModal';
import ConfirmationModal from './ConfirmationModal';

const DEFAULT_ICON_URL = '/default-icon.jpg';

// --- SVG Icons ---
const SettingsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>);
const DeleteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);
const DeleteAllIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>);

// --- Helper Functions ---
const formatMoney = (amount, currencySymbol, numberFormat) => {
  const num = Number(amount);
  if (isNaN(num)) return `${currencySymbol || '$'}0.00`;
  const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  switch (numberFormat) {
    case 'dot': return `${currencySymbol}${new Intl.NumberFormat('de-DE', options).format(num)}`;
    case 'none': return `${currencySymbol}${num.toFixed(2)}`;
    case 'comma': default: return `${currencySymbol}${new Intl.NumberFormat('en-US', options).format(num)}`;
  }
};

// --- Main Component ---
const Dashboard = ({ user, onLogout }) => { // I've added onLogout back to the props
  const [showSetupModal, setShowSetupModal] = useState(false); // State moved back inside
  const [isNewUser, setIsNewUser] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showConfirmDeleteAllModal, setShowConfirmDeleteAllModal] = useState(false);

  const [budget, setBudget] = useState(1000);
  const [expenses, setExpenses] = useState([]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');
  const [currency, setCurrency] = useState('$');
  const [appTitle, setAppTitle] = useState('');
  const [appIcon, setAppIcon] = useState('');
  const [numberFormat, setNumberFormat] = useState('comma');

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = budget - totalExpenses;
  const progress = budget > 0 ? (totalExpenses / budget) * 100 : 0;

  useEffect(() => {
    const userDocRef = doc(db, 'users', user.uid);
    const fetchData = async () => {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setIsNewUser(false);
        const userData = docSnap.data();
        setBudget(userData.budget || 1000);
        setCurrency(userData.currency || '$');
        setAppTitle(userData.appTitle || (user.isAnonymous ? 'Guest Budget' : `${user.displayName}'s Budget`));
        setAppIcon(userData.appIcon || user.photoURL || DEFAULT_ICON_URL);
        setNumberFormat(userData.numberFormat || 'comma');
      } else {
        setIsNewUser(true);
        setShowSetupModal(true);
        setAppTitle(user.isAnonymous ? 'Guest Budget' : `${user.displayName}'s Budget`);
        setAppIcon(user.photoURL || DEFAULT_ICON_URL);
      }
    };
    fetchData();
  }, [user.uid, user.displayName, user.photoURL, user.isAnonymous]);

  useEffect(() => {
    if (!user.uid) return;
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(expensesColRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleDownloadPdf = () => { /* ... (no changes here) ... */ };
  const handleDeleteAllExpenses = async () => { /* ... (no changes here) ... */ };
  const handleSaveSettings = async (settings) => { /* ... (no changes here) ... */ };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = Number(newExpenseAmount);

    if (!newExpenseDesc || !newExpenseDesc.trim()) {
      return toast.error("Please enter a description for the expense.");
    }

    if (isNaN(amount) || amount <= 0) {
      return toast.error("Please enter a valid, positive amount.");
    }

    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    await addDoc(expensesColRef, {
      description: newExpenseDesc,
      amount: amount,
      createdAt: new Date(),
      notes: newExpenseNotes,
    });

    setNewExpenseDesc('');
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    toast.success("Expense added!");
  };

  const handleUpdateExpense = async (updatedExpense) => { /* ... (no changes here) ... */ };
  const handleDeleteExpense = async (expenseId) => { /* ... (no changes here) ... */ };
  const handleUndoDelete = async (idToRestore, dataToRestore) => { /* ... (no changes here) ... */ };
  const getProgressBarColor = () => { /* ... (no changes here) ... */ };

  return (
    <>
      <SetupModal
        isOpen={showSetupModal}
        onSave={handleSaveSettings}
        onClose={() => setShowSetupModal(false)}
        user={user}
        initialSettings={{ appTitle, appIcon, budget, currency, numberFormat, isNewUser }}
      />
      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleUpdateExpense}
        expense={editingExpense}
      />
      <ConfirmationModal
        isOpen={showConfirmDeleteAllModal}
        onClose={() => setShowConfirmDeleteAllModal(false)}
        onConfirm={handleDeleteAllExpenses}
        title="Delete All Expenses?"
        message="Are you sure you want to permanently delete all of your expenses? This action cannot be undone."
      />

      <div className="max-w-5xl mx-auto p-4 md:p-8">
         <div className="flex justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <img src={appIcon} alt="App Icon" className="w-16 h-16 object-cover flex-shrink-0 rounded-lg" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 truncate">
              {appTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
              <button onClick={() => setShowSetupModal(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Settings">
                <SettingsIcon />
              </button>
              <ThemeToggle />
              <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all">
                Logout
              </button>
          </div>
        </div>

        <main>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
            {/* ... (progress bar section, no changes) ... */}
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
                
                {/* THIS IS THE CORRECTED LINE */}
                <input value={newExpenseDesc} onChange={(e) => setNewExpenseDesc(e.target.value)} placeholder="Description" className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                
                <input type="number" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} placeholder="Amount" className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea
                  value={newExpenseNotes}
                  onChange={(e) => setNewExpenseNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows="3"
                  className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="p-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-all">Add Expense</button>
              </form>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Your Expenses</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Download as PDF"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    onClick={() => setShowConfirmDeleteAllModal(true)}
                    className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete All Expenses"
                  >
                    <DeleteAllIcon />
                  </button>
                </div>
              </div>
              <ul className="space-y-3 h-[400px] overflow-y-auto pr-2">
                {expenses.length === 0 && <p className="text-gray-500 dark:text-gray-400">No expenses added yet.</p>}
                {expenses.map(expense => (
                  <li key={expense.id} className="flex justify-between items-start bg-slate-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 dark:text-gray-200 break-words">{expense.description}</p>
                      {expense.notes && (<p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1 break-words">{expense.notes}</p>)}
                      {expense.createdAt && (<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{expense.createdAt.toDate().toLocaleString()}</p>)}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="font-bold text-gray-800 dark:text-gray-100">{formatMoney(expense.amount, currency, numberFormat)}</span>
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        title="Edit Expense"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                        title="Delete Expense"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;