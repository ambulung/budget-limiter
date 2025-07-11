import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
// Import updateDoc from firestore
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, deleteDoc, query, orderBy, updateDoc } from "firebase/firestore";
import { toast } from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import SetupModal from './SetupModal';
import EditExpenseModal from './EditExpenseModal'; // --- IMPORT NEW MODAL ---

const DEFAULT_ICON_URL = '/default-icon.jpg'; 

const SettingsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
// --- NEW ICONS FOR BUTTONS ---
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> );
const DeleteIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );

const Dashboard = ({ user, onLogout }) => {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // --- NEW STATE TO MANAGE EDITING ---
  const [editingExpense, setEditingExpense] = useState(null);

  const [budget, setBudget] = useState(1000);
  const [expenses, setExpenses] = useState([]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');
  const [currency, setCurrency] = useState('$');
  const [appTitle, setAppTitle] = useState('');
  const [appIcon, setAppIcon] = useState('');

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = budget - totalExpenses;
  const progress = budget > 0 ? (totalExpenses / budget) * 100 : 0;
  
  // ... (useEffect for user data and expenses remains the same) ...
  useEffect(() => {
    const userDocRef = doc(db, 'users', user.uid);
    const fetchData = async () => {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setIsNewUser(false);
        const userData = docSnap.data();
        setBudget(userData.budget || 1000);
        setCurrency(userData.currency || '$');
        setAppTitle(userData.appTitle || `${user.displayName}'s Budget`);
        setAppIcon(userData.appIcon || user.photoURL || DEFAULT_ICON_URL);
      } else {
        setIsNewUser(true);
        setShowSetupModal(true);
        setAppTitle(`${user.displayName}'s Budget`);
        setAppIcon(user.photoURL || DEFAULT_ICON_URL);
      }
    };
    fetchData();
  }, [user.uid, user.displayName, user.photoURL]);

  useEffect(() => {
    if (!user.uid) return;
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(expensesColRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSaveSettings = async (settings) => {
    // ... (this function remains the same) ...
    if (!settings.budget || settings.budget <= 0) return toast.error("Please enter a valid budget.");
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, settings, { merge: true });
      setBudget(settings.budget);
      setCurrency(settings.currency);
      setAppTitle(settings.appTitle);
      setAppIcon(settings.appIcon);
      setShowSetupModal(false);
      toast.success("Settings saved!");
    } catch (error) { toast.error("Failed to save settings."); console.error(error); }
  };
  
  const handleAddExpense = async (e) => {
    // ... (this function remains the same) ...
    e.preventDefault();
    const amount = Number(newExpenseAmount);
    if (!newExpenseDesc || isNaN(amount) || amount <= 0) return toast.error("Please enter a valid description and amount.");
    
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const newExpenseData = {
      description: newExpenseDesc,
      amount: amount,
      createdAt: new Date(),
      notes: newExpenseNotes,
    };
    await addDoc(expensesColRef, newExpenseData);
    
    setNewExpenseDesc('');
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    toast.success("Expense added!");
  };

  // --- NEW FUNCTION TO HANDLE UPDATING AN EXPENSE ---
  const handleUpdateExpense = async (updatedExpense) => {
    const expenseDocRef = doc(db, 'users', user.uid, 'expenses', updatedExpense.id);
    try {
      // We only update the fields that can be changed
      await updateDoc(expenseDocRef, {
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        notes: updatedExpense.notes,
      });
      toast.success("Expense updated!");
      setEditingExpense(null); // Close the modal on success
    } catch (error) {
      toast.error("Failed to update expense.");
      console.error("Error updating document: ", error);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    // ... (this function remains the same) ...
    const expenseDocRef = doc(db, 'users', user.uid, 'expenses', expenseId);
    try {
      const docSnap = await getDoc(expenseDocRef);
      if (!docSnap.exists()) return;
      const deletedData = docSnap.data();
      await deleteDoc(expenseDocRef);
      toast((t) => (
        <span className="flex items-center gap-4">
          Expense deleted.
          <button className="px-3 py-1 bg-blue-500 text-white rounded-md font-semibold" onClick={() => { handleUndoDelete(expenseId, deletedData); toast.dismiss(t.id); }}>
            Undo
          </button>
        </span>
      ), { duration: 6000 });
    } catch (error) { toast.error("Failed to delete expense."); console.error(error); }
  };

  const handleUndoDelete = async (idToRestore, dataToRestore) => {
    // ... (this function remains the same) ...
    if (!idToRestore || !dataToRestore) return;
    const expenseDocRef = doc(db, 'users', user.uid, 'expenses', idToRestore);
    try {
      await setDoc(expenseDocRef, dataToRestore);
      toast.success("Expense restored!");
    } catch (error) { toast.error("Failed to restore expense."); console.error(error); }
  };

  const getProgressBarColor = () => {
    if (progress >= 80) return 'bg-red-500';
    if (progress >= 60) return 'bg-orange-500';
    return 'bg-blue-600';
  };

  return (
    <>
      <SetupModal 
        isOpen={showSetupModal}
        onSave={handleSaveSettings}
        onClose={() => setShowSetupModal(false)}
        user={user}
        initialSettings={{ appTitle, appIcon, budget, currency, isNewUser }}
      />

      {/* --- RENDER THE EDIT MODAL --- */}
      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleUpdateExpense}
        expense={editingExpense}
      />
      
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header remains the same */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <img src={appIcon} alt="App Icon" className="w-16 h-16 object-cover" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">{appTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSetupModal(true)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <SettingsIcon />
            </button>
            <ThemeToggle />
            <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all">
              Logout
            </button>
          </div>
        </header>
        <main>
          {/* Progress bar section remains the same */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {currency}{totalExpenses.toFixed(2)}
                <span className="text-gray-400 dark:text-gray-500 text-lg"> / {currency}{budget.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
              <div className={`h-4 rounded-full transition-all duration-500 ${getProgressBarColor()}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
            <p className="text-right font-medium text-gray-600 dark:text-gray-400">
              {currency}{remainingBudget.toFixed(2)} Remaining
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Add expense form remains the same */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
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
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Your Expenses</h3>
              <ul className="space-y-3 h-[400px] overflow-y-auto pr-2">
                {expenses.length === 0 && <p className="text-gray-500 dark:text-gray-400">No expenses added yet.</p>}
                {expenses.map(expense => (
                  <li key={expense.id} className="flex justify-between items-start bg-slate-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 dark:text-gray-200 break-words">{expense.description}</p>
                      {expense.notes && ( <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1 break-words">{expense.notes}</p> )}
                      {expense.createdAt && ( <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{expense.createdAt.toDate().toLocaleString()}</p> )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="font-bold text-gray-800 dark:text-gray-100">{currency}{expense.amount.toFixed(2)}</span>
                      {/* --- MODIFICATION: ADD EDIT BUTTON --- */}
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