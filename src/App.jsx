import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // CORRECTED: This effect is now the single source of truth for the auth state.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Always trust the state from Firebase.
      setLoading(false);
    });
    // This function is called when the component unmounts to prevent memory leaks.
    return () => unsubscribe();
  }, []); // The empty dependency array is correct here, it should only run once.

  const handleGuestLogin = () => {
    const guestUser = {
      uid: 'guest',
      displayName: 'Guest',
      isGuest: true,
    };
    setUser(guestUser);
    toast.success("You are now in Guest Mode!");
  };

  // CORRECTED: The logout logic is now much cleaner.
  const handleLogout = async () => {
    try {
      if (user && user.isGuest) {
        // For guests, we just clear the local state manually.
        setUser(null);
      } else {
        // For real users, signing out will trigger the onAuthStateChanged listener,
        // which will then set the user state to null.
        await signOut(auth);
      }
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
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      <Header />
      
      <main className="flex-grow">
        {/* This conditional rendering is the ultimate guard against the error */}
        {user ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <Login onGuestLogin={handleGuestLogin} />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;