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
import EditIncomeModal from './EditIncomeModal';
import ConfirmationModal from './ConfirmationModal';

// --- SVG Icons ---
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> );
const DeleteIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> );
const DeleteAllIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );

const ArrowUpIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> );
const ArrowDownIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> );

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

const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();

  const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  return `${formattedDate}, ${formattedTime}`;
};


// --- Main Component ---
const Dashboard = ({ user, showSetupModal, setShowSetupModal, appSettings, updateAppSettings }) => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [showConfirmDeleteAllModal, setShowConfirmDeleteAllModal] = useState(false);
  const [confirmDeleteAllType, setConfirmDeleteAllType] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');

  const [incomes, setIncomes] = useState([]);
  const [newIncomeDesc, setNewIncomeDesc] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeNotes, setNewIncomeNotes] = useState('');

  // REMOVED: budgetAdjustment state
  // const [budgetAdjustment, setBudgetAdjustment] = useState('');

  const { budget, currency, numberFormat, appTitle } = appSettings;

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const remainingBudget = (budget + totalIncome) - totalExpenses;
  // MODIFIED: remainingProgress calculation toFixed(2)
  const remainingProgress = (budget + totalIncome) > 0
    ? ((remainingBudget / (budget + totalIncome)) * 100).toFixed(2)
    : 0; // Keep 0 if total budget is 0 to avoid NaN/Infinity


  const allTransactions = [...expenses.map(e => ({ ...e, type: 'expense' })), ...incomes.map(i => ({ ...i, type: 'income' }))]
    .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

  const getTextColorClass = () => {
    // Note: remainingProgress is now a string due to toFixed(2)
    // Convert back to number for comparison if needed, or compare as string if consistent
    const progressNum = parseFloat(remainingProgress);
    if (progressNum <= 20) return 'text-red-500';
    if (progressNum <= 50) return 'text-orange-500';
    return 'text-green-500';
  };

  const getProgressBarFillColor = () => {
    const progressNum = parseFloat(remainingProgress);
    if (progressNum <= 20) return 'bg-red-500';
    if (progressNum <= 50) return 'bg-orange-500';
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

    const incomesColRef = collection(db, 'users', user.uid, 'incomes');
    const qIncomes = query(incomesColRef, orderBy('createdAt', 'desc'));
    const unsubscribeIncomes = onSnapshot(qIncomes, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeIncomes();
    };
  }, [user.uid]);

  // REMOVED: handleUndoBudgetChange function
  // REMOVED: handleUpdateBudget function

  const handleSaveSettings = async (settings) => {
    if (!settings.budget || settings.budget <= 0) return toast.error("Please enter a valid budget.");
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, settings, { merge: true });
      updateAppSettings(prev => ({...prev, ...settings}));
      setShowSetupModal(false);
      toast.success("Settings saved!");
    } catch (error) { toast.error("Failed to save settings."); console.error(error); }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = Number(newExpenseAmount);

    if (!newExpenseDesc.trim() || isNaN(amount) || amount <= 0) {
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
    } catch (error) { toast.error("Failed to update expense."); console.error(error); }
  };

  const handleUpdateIncome = async (updatedIncome) => {
    const incomeDocRef = doc(db, 'users', user.uid, 'incomes', updatedIncome.id);
    try {
      await updateDoc(incomeDocRef, {
        description: updatedIncome.description,
        amount: updatedIncome.amount,
        notes: updatedIncome.notes,
      });
      toast.success("Income updated!");
      setEditingIncome(null);
    } catch (error) {
      toast.error("Failed to update income.");
      console.error("Update income error:", error);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    const docRef = transaction.type === 'expense'
      ? doc(db, 'users', user.uid, 'expenses', transaction.id)
      : doc(db, 'users', user.uid, 'incomes', transaction.id);

    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      const deletedData = docSnap.data();
      await deleteDoc(docRef);
      toast((t) => (
        <span className="flex items-center gap-4">
          {transaction.type === 'expense' ? 'Expense' : 'Income'} deleted.
          <button className="px-3 py-1 bg-blue-500 text-white rounded-md font-semibold" onClick={() => { handleUndoDelete(transaction.id, deletedData, transaction.type); toast.dismiss(t.id); }}>
            Undo
          </button>
        </span>
      ), { duration: 6000 });
    } catch (error) { toast.error(`Failed to delete ${transaction.type}.`); console.error(error); }
  };

  const handleUndoDelete = async (idToRestore, dataToRestore, transactionType) => {
    if (!idToRestore || !dataToRestore || !transactionType) return;
    const docRef = transactionType === 'expense'
      ? doc(db, 'users', user.uid, 'expenses', idToRestore)
      : doc(db, 'users', user.uid, 'incomes', idToRestore);
    try {
      await setDoc(docRef, dataToRestore);
      toast.success(`${transactionType === 'expense' ? 'Expense' : 'Income'} restored!`);
    } catch (error) { toast.error(`Failed to restore ${transactionType}.`); console.error(error); }
  };

  const handleDownloadPdf = () => {
    if (expenses.length === 0 && incomes.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Financial Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`For: ${appTitle}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

    let finalY = 45;

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
        headStyles: { fillColor: [67, 160, 71] },
        columnStyles: { 3: { halign: 'right' } }
      });
      finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Total Income: ${formatMoney(totalIncome, currency, numberFormat)}`, 14, finalY);
      finalY += 10;
    }

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
        headStyles: { fillColor: [229, 57, 53] },
        columnStyles: { 3: { halign: 'right' } }
      });
      finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Total Expenses: ${formatMoney(totalExpenses, currency, numberFormat)}`, 14, finalY);
      finalY += 10;
    }


    doc.setFontSize(12);
    doc.text(`Initial Budget: ${formatMoney(budget, currency, numberFormat)}`, 14, finalY + 10);
    doc.text(`Net Balance: ${formatMoney(budget + totalIncome - totalExpenses, currency, numberFormat)}`, 14, finalY + 17);

    doc.save(`financial-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Report downloaded!");
  };

  const confirmDeleteAll = (type) => {
    setConfirmDeleteAllType(type);
    setShowConfirmDeleteAllModal(true);
  };

  const handleDeleteAllConfirmed = async () => {
    setShowConfirmDeleteAllModal(false);
    if (!confirmDeleteAllType) return;

    let deletionPromise;
    let collectionRef;
    let successMsg;
    let errorMsg;

    if (confirmDeleteAllType === 'expenses') {
      if (expenses.length === 0) {
        return toast.error("There are no expenses to delete.");
      }
      collectionRef = collection(db, 'users', user.uid, 'expenses');
      deletionPromise = Promise.all(expenses.map(expense => deleteDoc(doc(collectionRef, expense.id))));
      successMsg = 'All expenses deleted successfully!';
      errorMsg = 'Failed to delete all expenses.';
    } else if (confirmDeleteAllType === 'incomes') {
      if (incomes.length === 0) {
        return toast.error("There are no incomes to delete.");
      }
      collectionRef = collection(db, 'users', user.uid, 'incomes');
      deletionPromise = Promise.all(incomes.map(income => deleteDoc(doc(collectionRef, income.id))));
      successMsg = 'All incomes deleted successfully!';
      errorMsg = 'Failed to delete all incomes.';
    } else {
        return;
    }

    toast.promise(deletionPromise, {
      loading: `Deleting all ${confirmDeleteAllType}...`,
      success: successMsg,
      error: errorMsg,
    });
    setConfirmDeleteAllType(null);
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
      <EditIncomeModal
        isOpen={!!editingIncome}
        onClose={() => setEditingIncome(null)}
        onSave={handleUpdateIncome}
        income={editingIncome}
      />
      <ConfirmationModal
        isOpen={showConfirmDeleteAllModal}
        onClose={() => setShowConfirmDeleteAllModal(false)}
        onConfirm={handleDeleteAllConfirmed}
        title={`Delete All ${confirmDeleteAllType === 'expenses' ? 'Expenses' : 'Incomes'}?`}
        message={`Are you sure you want to permanently delete all of your ${confirmDeleteAllType}? This action cannot be undone.`}
        confirmButtonText={`Yes, Delete All ${confirmDeleteAllType === 'expenses' ? 'Expenses' : 'Incomes'}`}
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
                <span className="text-gray-400 dark:text-gray-500 text-lg"> / {formatMoney(budget + totalIncome, currency, numberFormat)}</span>
              </div>
              {(budget + totalIncome) > 0 && (
                <span className={`text-xl font-bold ${getTextColorClass()}`}>
                  {remainingProgress}% {/* MODIFIED: No Math.round(), uses toFixed(2) from calculation */}
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarFillColor()}`}
                style={{ width: `${Math.max(0, parseFloat(remainingProgress))}%` }} {/* MODIFIED: parseFloat for style */}
              ></div>
            </div>
            <p className={`text-right font-medium ${getTextColorClass()} mb-6`}>
              {formatMoney(remainingBudget, currency, numberFormat)} Remaining
            </p>

            {/* REMOVED: Adjust Budget Section */}
            {/* <div className="border-t dark:border-gray-700 pt-4">
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
            </div> */}
          </div>

          {/* --- Forms: Income on Left, Expense on Right --- */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* --- Add New Income Form --- */}
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
                <button type="submit" className="p-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all">Add Income</button>
              </form>
            </div>

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
                <button type="submit" className="p-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all">Add Expense</button>
              </form>
            </div>
          </div>

          {/* --- Consolidated Transactions List --- */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">All Transactions</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Download Financial Report"
                >
                  <DownloadIcon />
                </button>
                <button
                  onClick={() => confirmDeleteAll('expenses')}
                  className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  title="Delete All Expenses"
                >
                  <DeleteAllIcon />
                </button>
                <button
                  onClick={() => confirmDeleteAll('incomes')}
                  className="p-2 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                  title="Delete All Incomes"
                >
                  <DeleteAllIcon />
                </button>
              </div>
            </div>
            <div className="flex justify-between text-lg font-semibold mb-3">
              <span className="text-green-600 dark:text-green-400">Total Income: {formatMoney(totalIncome, currency, numberFormat)}</span>
              <span className="text-red-600 dark:text-red-400">Total Expenses: {formatMoney(totalExpenses, currency, numberFormat)}</span>
            </div>
            <ul className="space-y-3 h-[400px] overflow-y-auto pr-2">
              {allTransactions.length === 0 && <p className="text-gray-500 dark:text-gray-400">No transactions added yet.</p>}
              {allTransactions.map(transaction => (
                <li
                  key={transaction.id}
                  className={`flex justify-between items-start p-3 rounded-lg
                              ${transaction.type === 'income' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {transaction.type === 'income' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    <div>
                      <p className="text-gray-700 dark:text-gray-200 break-words">{transaction.description}</p>
                      {transaction.notes && ( <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1 break-words">{transaction.notes}</p> )}
                      {transaction.createdAt && ( <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(transaction.createdAt)}</p> )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className={`font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'} {formatMoney(transaction.amount, currency, numberFormat)}
                    </span>
                    <button
                      onClick={() => transaction.type === 'expense' ? setEditingExpense(transaction) : setEditingIncome(transaction)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      title={`Edit ${transaction.type}`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(transaction)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                      title={`Delete ${transaction.type}`}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;