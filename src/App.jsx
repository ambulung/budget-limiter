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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Don't set user if it's null (logout) and we are already in guest mode
      if (currentUser || !user?.isGuest) {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGuestLogin = () => {
    const guestUser = {
      uid: 'guest',
      displayName: 'Guest',
      isGuest: true,
    };
    setUser(guestUser);
    toast.success("You are now in Guest Mode!");
  };

  const handleLogout = async () => {
    try {
      if (user && !user.isGuest) {
        await signOut(auth);
      }
      setUser(null); // This handles both guest and real user logout
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