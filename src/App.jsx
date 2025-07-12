import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth"; // Import deleteUser
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    // Check if the current user is anonymous
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      if (window.confirm("Ending the guest session will permanently delete all your data. Are you sure?")) {
        try {
          await deleteUser(auth.currentUser);
          toast.success("Guest session ended.");
        } catch (error) {
          console.error("Error deleting anonymous user:", error);
          toast.error("Failed to end session.");
        }
      }
    } else {
      // Regular logout for registered users
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout error:", error);
        toast.error("Failed to log out.");
      }
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
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onOpenSettings={() => setShowSetupModal(true)} 
      />
      <main className="flex-grow">
        {user ? (
          <Dashboard 
            user={user} 
            showSetupModal={showSetupModal} 
            setShowSetupModal={setShowSetupModal} 
          />
        ) : (
          <Login />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;