// src/components/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, deleteDoc, query, orderBy, updateDoc } from "firebase/firestore";
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Component Imports
import SetupModal from './SetupModal';
import EditExpenseModal from './EditExpenseModal';
import ConfirmationModal from './ConfirmationModal';

// --- SVG Icons ---
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> );
const DeleteIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> );
const DeleteAllIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );

// --- Helper Functions ---
const formatMoney = (amount, currencySymbol, numberFormat) => {
  const num = Number(amount);
  if (isNaN(num)) return `${currencySymbol || '$'}0.00`;

  const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

  switch (numberFormat) {
    case 'dot':
      return `${currencySymbol}${new Intl.NumberFormat('de-DE', options).format(num)}`;
    case 'none':
      return `${currencySymbol}${num.toFixed(2)}`;
    case 'comma':
    default:
      return `${currencySymbol}${new Intl.NumberFormat('en-US', options).format(num)}`;
  }
};

// --- Main Component ---
const Dashboard = ({ user, showSetupModal, setShowSetupModal, appSettings, updateAppSettings }) => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showConfirmDeleteAllModal, setShowConfirmDeleteAllModal] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');

  // NEW: State for Income form
  const [newIncomeDesc, setNewIncomeDesc] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeNotes, setNewIncomeNotes] = useState('');
  const [incomes, setIncomes] = useState([]); // NEW: State for incomes list

  const [budgetAdjustment, setBudgetAdjustment] = useState('');

  const { budget, currency, numberFormat, appTitle } = appSettings;

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0); // NEW: Calculate total income
  // MODIFIED: Remaining budget should now consider total income
  const remainingBudget = (budget + totalIncome) - totalExpenses;
  const remainingProgress = (budget + totalIncome) > 0 ? (remainingBudget / (budget + totalIncome)) * 100 : 0;

  // getTextColorClass now returns the text color class directly
  const getTextColorClass = () => {
    if (remainingProgress <= 20) return 'text-red-500';
    if (remainingProgress <= 50) return 'text-orange-500';
    return 'text-green-500';
  };

  // This is for the progress bar itself (the background fill)
  const getProgressBarFillColor = () => {
    if (remainingProgress <= 20) return 'bg-red-500';
    if (remainingProgress <= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };


  useEffect(() => {
    const userDocRef = doc(db, 'users', user.uid);
    const checkIsNew = async () => {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            setIsNewUser(true);
            setShowSetupModal(true);
        } else {
            setIsNewUser(false);
        }
    };
    checkIsNew();
  }, [user.uid, setShowSetupModal]);

  useEffect(() => {
    if (!user.uid) return;
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const qExpenses = query(expensesColRef, orderBy('createdAt', 'desc'));
    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // NEW: Listen for incomes
    const incomesColRef = collection(db, 'users', user.uid, 'incomes');
    const qIncomes = query(incomesColRef, orderBy('createdAt', 'desc'));
    const unsubscribeIncomes = onSnapshot(qIncomes, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeIncomes(); // Cleanup income listener
    };
  }, [user.uid]);

  const handleUndoBudgetChange = async (previousBudget) => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const newSettings = { ...appSettings, budget: previousBudget };
      await setDoc(userDocRef, { budget: previousBudget }, { merge: true });
      updateAppSettings(newSettings); // Sync parent state
      toast.success(`Budget restored to ${formatMoney(previousBudget, currency, numberFormat)}`);
    } catch (error) {
      toast.error("Failed to undo budget change.");
      console.error("Undo budget error:", error);
    }
  };

  const handleUpdateBudget = async (adjustmentAmount) => {
    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      return toast.error("Please enter a valid number.");
    }

    const previousBudget = budget; // Capture budget *before* the change
    const newBudget = previousBudget + amount;

    if (newBudget < totalExpenses) {
      return toast.error(`New budget cannot be lower than total expenses (${formatMoney(totalExpenses, currency, numberFormat)}).`);
    }

    const userDocRef = doc(db, 'users', user.uid);
    try {
      const newSettings = { ...appSettings, budget: newBudget };
      await setDoc(userDocRef, { budget: newBudget }, { merge: true });
      updateAppSettings(newSettings);
      setBudgetAdjustment(''); // Clear input field

      // Show a toast with an Undo button
      toast((t) => (
        <span className="flex items-center gap-4">
          Budget updated.
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded-md font-semibold"
            onClick={() => {
              handleUndoBudgetChange(previousBudget); // Call undo with the old value
              toast.dismiss(t.id); // Dismiss this toast
            }}
          >
            Undo
          </button>
        </span>
      ), { duration: 6000 });

    } catch (error) {
      toast.error("Failed to update budget.");
      console.error(error);
    }
  };

  const handleSaveSettings = async (settings) => {
    if (!settings.budget || settings.budget <= 0) return toast.error("Please enter a valid budget.");
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, settings, { merge: true });
      updateAppSettings(prev => ({...prev, ...settings})); // Update parent state with all settings
      setShowSetupModal(false);
      toast.success("Settings saved!");
    } catch (error) { toast.error("Failed to save settings."); console.error(error); }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    const amount = Number(newExpenseAmount);

    if (!newExpenseDesc.trim() || isNaN(amount) || amount <= 0) {
      console.log('Validation failed:', { newExpenseDesc, newExpenseAmount, amount });
      toast.error("Please enter a valid description and amount.");
      return;
    }

    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    try {
      await addDoc(expensesColRef, {
        description: newExpenseDesc.trim(),
        amount: amount,
        createdAt: new Date(),
        notes: newExpenseNotes.trim(),
      });

      setNewExpenseDesc('');
      setNewExpenseAmount('');
      setNewExpenseNotes('');
      toast.success("Expense added!");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense.");
    }
  };

  // NEW: handleAddIncome function
  const handleAddIncome = async (e) => {
    e.preventDefault();

    const amount = Number(newIncomeAmount);

    if (!newIncomeDesc.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid description and amount for income.");
      return;
    }

    const incomesColRef = collection(db, 'users', user.uid, 'incomes');
    try {
      await addDoc(incomesColRef, {
        description: newIncomeDesc.trim(),
        amount: amount,
        createdAt: new Date(),
        notes: newIncomeNotes.trim(),
      });

      setNewIncomeDesc('');
      setNewIncomeAmount('');
      setNewIncomeNotes('');
      toast.success("Income added!");
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income.");
    }
  };


  const handleUpdateExpense = async (updatedExpense) => {
    const expenseDocRef = doc(db, 'users', user.uid, 'expenses', updatedExpense.id);
    try {
      await updateDoc(expenseDocRef, {
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        notes: updatedExpense.notes,
      });
      toast.success("Expense updated!");
      setEditingExpense(null);
    } catch (error) { toast.error("Failed to update expense."); }
  };

  const handleDeleteExpense = async (expenseId) => {
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
    } catch (error) { toast.error("Failed to delete expense."); }
  };

  const handleUndoDelete = async (idToRestore, dataToRestore) => {
    if (!idToRestore || !dataToRestore) return;
    const expenseDocRef = doc(db, 'users', user.uid, 'expenses', idToRestore);
    try {
      await setDoc(expenseDocRef, dataToRestore);
      toast.success("Expense restored!");
    } catch (error) { toast.error("Failed to restore expense."); }
  };

  const handleDownloadPdf = () => {
    if (expenses.length === 0 && incomes.length === 0) { // MODIFIED: Check both expenses and incomes
      toast.error("No data to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Financial Report", 14, 22); // MODIFIED: More general title
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`For: ${appTitle}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

    let finalY = 45;

    // Add Incomes Table
    if (incomes.length > 0) {
      doc.setFontSize(14);
      doc.text("Income", 14, finalY);
      autoTable(doc, {
        head: [["Date", "Description", "Notes", "Amount"]],
        body: incomes.map(income => [
          income.createdAt.toDate().toLocaleDateString(),
          income.description,
          income.notes || "-",
          formatMoney(income.amount, currency, numberFormat)
        ]),
        startY: finalY + 5,
        styles: { halign: 'left' },
        headStyles: { fillColor: [67, 160, 71] }, // Green for income
        columnStyles: { 3: { halign: 'right' } }
      });
      finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Total Income: ${formatMoney(totalIncome, currency, numberFormat)}`, 14, finalY);
      finalY += 10;
    }

    // Add Expenses Table
    if (expenses.length > 0) {
      doc.setFontSize(14);
      doc.text("Expenses", 14, finalY);
      autoTable(doc, {
        head: [["Date", "Description", "Notes", "Amount"]],
        body: expenses.map(expense => [
          expense.createdAt.toDate().toLocaleDateString(),
          expense.description,
          expense.notes || "-",
          formatMoney(expense.amount, currency, numberFormat)
        ]),
        startY: finalY + 5,
        styles: { halign: 'left' },
        headStyles: { fillColor: [229, 57, 53] }, // Red for expenses
        columnStyles: { 3: { halign: 'right' } }
      });
      finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Total Expenses: ${formatMoney(totalExpenses, currency, numberFormat)}`, 14, finalY);
      finalY += 10;
    }


    doc.setFontSize(12);
    doc.text(`Initial Budget: ${formatMoney(budget, currency, numberFormat)}`, 14, finalY + 10); // MODIFIED
    doc.text(`Net Balance: ${formatMoney(budget + totalIncome - totalExpenses, currency, numberFormat)}`, 14, finalY + 17); // MODIFIED

    doc.save(`financial-report-${new Date().toISOString().slice(0, 10)}.pdf`); // MODIFIED filename
    toast.success("Report downloaded!");
  };

  const handleDeleteAllExpenses = async () => {
    setShowConfirmDeleteAllModal(false);
    if (expenses.length === 0) {
      return toast.error("There are no expenses to delete.");
    }
    const deletionPromise = Promise.all(
      expenses.map(expense =>
        deleteDoc(doc(db, 'users', user.uid, 'expenses', expense.id))
      )
    );
    toast.promise(deletionPromise, {
      loading: 'Deleting all expenses...',
      success: 'All expenses deleted successfully!',
      error: 'Failed to delete all expenses.',
    });
  };

  // NEW: handle delete all incomes (optional, but good practice)
  const handleDeleteAllIncomes = async () => {
    setShowConfirmDeleteAllModal(false); // Reusing this modal, but you might want a separate one
    if (incomes.length === 0) {
      return toast.error("There are no incomes to delete.");
    }
    const deletionPromise = Promise.all(
      incomes.map(income =>
        deleteDoc(doc(db, 'users', user.uid, 'incomes', income.id))
      )
    );
    toast.promise(deletionPromise, {
      loading: 'Deleting all incomes...',
      success: 'All incomes deleted successfully!',
      error: 'Failed to delete all incomes.',
    });
  };


  return (
    <>
      <SetupModal
        isOpen={showSetupModal}
        onSave={handleSaveSettings}
        onClose={() => setShowSetupModal(false)}
        user={user}
        initialSettings={{ ...appSettings, isNewUser }}
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
        onConfirm={handleDeleteAllExpenses} // This modal could be made more generic to handle income deletion too
        title="Delete All Expenses?"
        message="Are you sure you want to permanently delete all of your expenses? This action cannot be undone."
      />

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <main>
          <h1
            className="text-gray-900 dark:text-gray-100 text-3xl font-extrabold leading-tight truncate mb-8"
            title={appTitle}
          >
            {appTitle}
          </h1>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
            <div className="flex justify-between items-center mb-2">
              <div className={`text-2xl font-bold ${getTextColorClass()}`}>
                {formatMoney(totalExpenses, currency, numberFormat)}
                <span className="text-gray-400 dark:text-gray-500 text-lg"> / {formatMoney(budget + totalIncome, currency, numberFormat)}</span> {/* MODIFIED: Budget includes total income */}
              </div>
              {/* Right side: Percentage */}
              {(budget + totalIncome) > 0 && ( // MODIFIED: Percentage based on initial budget + total income
                <span className={`text-xl font-bold ${getTextColorClass()}`}>
                  {Math.round(remainingProgress)}%
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarFillColor()}`}
                style={{ width: `${Math.max(0, remainingProgress)}%` }}
              ></div>
            </div>
            <p className={`text-right font-medium ${getTextColorClass()} mb-6`}>
              {formatMoney(remainingBudget, currency, numberFormat)} Remaining
            </p>

            {/* --- Budget adjustment controls --- */}
            <div className="border-t dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Adjust Budget</h4>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="number"
                  value={budgetAdjustment}
                  onChange={(e) => setBudgetAdjustment(e.target.value)}
                  placeholder="Amount"
                  className="p-2 w-full sm:w-1/3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleUpdateBudget(budgetAdjustment)}
                  className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow-sm hover:bg-green-600 transition-all"
                >
                  Add Budget
                </button>
                <button
                  onClick={() => handleUpdateBudget(-budgetAdjustment)}
                  className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-sm hover:bg-red-600 transition-all"
                >
                  Remove Budget
                </button>
              </div>
            </div>
          </div>

          {/* --- MODIFIED: Grid layout for Expense and Income forms --- */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* --- Add New Expense Form --- */}
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
                <button type="submit" className="p-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all">Add Expense</button> {/* MODIFIED: Button color to red */}
              </form>
            </div>

            {/* --- NEW: Add New Income Form (Clone of Expense) --- */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Add New Income</h3>
              <form onSubmit={handleAddIncome} className="flex flex-col gap-4">
                <input value={newIncomeDesc} onChange={(e) => setNewIncomeDesc(e.target.value)} placeholder="Description" className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" value={newIncomeAmount} onChange={(e) => setNewIncomeAmount(e.target.value)} placeholder="Amount" className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea
                  value={newIncomeNotes}
                  onChange={(e) => setNewIncomeNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows="3"
                  className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="p-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all">Add Income</button> {/* MODIFIED: Button color to green */}
              </form>
            </div>

            {/* --- Your Expenses List --- */}
            {/* This will now be on the second row of the grid, or below incomes on small screens */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md md:col-span-2"> {/* MODIFIED: Make it span full width on medium screens and up */}
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
              {/* NEW: Display Total Income/Expenses here for quick overview */}
              <div className="flex justify-between text-lg font-semibold mb-3">
                <span className="text-green-600 dark:text-green-400">Total Income: {formatMoney(totalIncome, currency, numberFormat)}</span>
                <span className="text-red-600 dark:text-red-400">Total Expenses: {formatMoney(totalExpenses, currency, numberFormat)}</span>
              </div>
              <ul className="space-y-3 h-[400px] overflow-y-auto pr-2">
                {expenses.length === 0 && incomes.length === 0 && <p className="text-gray-500 dark:text-gray-400">No transactions added yet.</p>} {/* MODIFIED: Message */}
                {/* It's good to show both expenses and incomes, maybe with different styling or in separate lists */}
                {/* For now, just showing expenses as per original list, but consider adding incomes too */}
                {expenses.map(expense => (
                  <li key={expense.id} className="flex justify-between items-start bg-slate-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 dark:text-gray-200 break-words">{expense.description}</p>
                      {expense.notes && ( <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1 break-words">{expense.notes}</p> )}
                      {expense.createdAt && ( <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(expense.createdAt.toDate()).toLocaleString()}</p> )}
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
            {/* NEW: Your Incomes List (Optional, can be separate or integrated) */}
            {/* For simplicity, I'll add it below the expenses list, but you could have two columns of lists */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md md:col-span-2"> {/* Make it span full width */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Your Incomes</h3>
                <div className="flex items-center gap-2">
                  {/* You might want a separate download/delete all for incomes */}
                  <button
                    onClick={handleDownloadPdf} // Reusing for now, but consider separate download for incomes
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Download as PDF"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    onClick={() => setShowConfirmDeleteAllModal(true)} // Reusing for now, consider new modal for incomes
                    className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete All Incomes"
                  >
                    <DeleteAllIcon />
                  </button>
                </div>
              </div>
              <ul className="space-y-3 h-[400px] overflow-y-auto pr-2">
                {incomes.length === 0 && <p className="text-gray-500 dark:text-gray-400">No incomes added yet.</p>}
                {incomes.map(income => (
                  <li key={income.id} className="flex justify-between items-start bg-slate-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 dark:text-gray-200 break-words">{income.description}</p>
                      {income.notes && ( <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1 break-words">{income.notes}</p> )}
                      {income.createdAt && ( <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(income.createdAt.toDate()).toLocaleString()}</p> )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="font-bold text-gray-800 dark:text-gray-100">{formatMoney(income.amount, currency, numberFormat)}</span>
                      {/* You'd need a separate EditIncomeModal if you want to edit incomes */}
                      {/* <button
                        onClick={() => setEditingIncome(income)}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        title="Edit Income"
                      >
                        <EditIcon />
                      </button> */}
                      {/* You'd need a separate handleDeleteIncome function */}
                      {/* <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                        title="Delete Income"
                      >
                        <DeleteIcon />
                      </button> */}
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