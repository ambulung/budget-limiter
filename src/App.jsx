// src/App.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

// --- 1. IMPORT YOUR NEW HEADER AND EXISTING COMPONENTS ---
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

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
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900">
      {/* --- 2. RENDER THE HEADER HERE, AT THE TOP LEVEL --- */}
      <Header />
      
      <main>
        <Toaster position="top-center" reverseOrder={false} />
        
        {user ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <Login />
        )}
      </main>
    </div>
  );
}

export default App;