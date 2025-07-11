// src/App.jsx

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer'; // <-- 1. IMPORT THE NEW FOOTER

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    // <-- 2. MODIFY THE LAYOUT to make the footer sticky -->
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      <Header />
      
      {/* 'flex-grow' makes the main content take up all available space, pushing the footer down */}
      <main className="flex-grow">
        {user ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <Login />
        )}
      </main>

      {/* <-- 3. ADD THE FOOTER COMPONENT AT THE END --> */}
      <Footer />
    </div>
  );
}

export default App;