import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, deleteDoc, query, orderBy } from "firebase/firestore";
import { toast } from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';

const Dashboard = ({ user, onLogout }) => {
  const [budget, setBudget] = useState(1000);
  const [newBudgetInput, setNewBudgetInput] = useState('');
  
  const [expenses, setExpenses] = useState([]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = budget - totalExpenses;
  const progress = budget > 0 ? (totalExpenses / budget) * 100 : 0;
  
  // Effect for fetching budget
  useEffect(() => {
    const userDocRef = doc(db, 'users', user.uid);
    const fetchBudget = async () => {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data().budget) {
        setBudget(docSnap.data().budget);
        setNewBudgetInput(docSnap.data().budget.toString());
      } else {
        setNewBudgetInput(budget.toString());
      }
    };
    fetchBudget();
  }, [user.uid]);

  // Effect for listening to expenses
  useEffect(() => {
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(expensesColRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expensesData);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSetBudget = async (e) => {
    e.preventDefault();
    const newBudgetValue = Number(newBudgetInput);
    if (isNaN(newBudgetValue) || newBudgetValue <= 0) return toast.error("Please enter a valid budget.");
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { budget: newBudgetValue }, { merge: true });
      setBudget(newBudgetValue);
      toast.success("Budget updated!");
    } catch (error) { toast.error("Failed to update budget."); console.error(error); }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = Number(newExpenseAmount);
    if (!newExpenseDesc || isNaN(amount) || amount <= 0) return toast.error("Please enter a valid description and amount.");
    const expensesColRef = collection(db, 'users', user.uid, 'expenses');
    try {
      await addDoc(expensesColRef, { description: newExpenseDesc, amount: amount, createdAt: new Date() });
      setNewExpenseDesc('');
      setNewExpenseAmount('');
      toast.success("Expense added!");
    } catch (error) { toast.error("Failed to add expense."); console.error(error); }
  };

  const handleDeleteExpense = async (expenseId) => {
    const expenseDocRef = doc(db, 'users', user.uid, 'expenses', expenseId);
    try {
      await deleteDoc(expenseDocRef);
      toast.success("Expense deleted.");
    } catch (error) { toast.error("Failed to delete expense."); console.error(error); }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <img src={user.photoURL} alt="User" className="w-12 h-12 rounded-full border-2 border-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">{user.displayName}'s Budget</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all">
            Logout
          </button>
        </div>
      </header>

      <main>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Monthly Progress</h2>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              ${totalExpenses.toFixed(2)}
              <span className="text-gray-400 dark:text-gray-500 text-lg"> / ${budget.toFixed(2)}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
            <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
          <p className="text-right font-medium text-gray-600 dark:text-gray-400">
            ${remainingBudget.toFixed(2)} Remaining
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
                <input value={newExpenseDesc} onChange={(e) => setNewExpenseDesc(e.target.value)} placeholder="Description" className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} placeholder="Amount" className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="p-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-all">Add Expense</button>
              </form>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Set Your Budget</h3>
              <form onSubmit={handleSetBudget} className="flex gap-4">
                <input type="number" value={newBudgetInput} onChange={(e) => setNewBudgetInput(e.target.value)} className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="p-3 px-6 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 transition-all">Save</button>
              </form>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Your Expenses</h3>
            <ul className="space-y-3 h-[400px] overflow-y-auto pr-2">
              {expenses.length === 0 && <p className="text-gray-500 dark:text-gray-400">No expenses added yet.</p>}
              {expenses.map(expense => (
                <li key={expense.id} className="flex justify-between items-center bg-slate-100 dark:bg-gray-700 p-3 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-200">{expense.description}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-800 dark:text-gray-100">${expense.amount.toFixed(2)}</span>
                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-500 hover:text-red-700 font-bold text-xl">
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;