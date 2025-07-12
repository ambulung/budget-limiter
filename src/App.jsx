import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';

// Component Imports
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';
import ConfirmationModal from './components/ConfirmationModal';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  // State to control our custom logout confirmation modal
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // This function now opens the modal for guests or logs out regular users directly.
  const handleLogout = () => {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      // For guests, open our beautiful confirmation modal instead of the browser alert.
      setShowConfirmEndSessionModal(true);
    } else {
      // For registered users, log out immediately.
      signOut(auth).catch(error => {
        console.error("Logout error:", error);
        toast.error("Failed to log out.");
      });
    }
  };

  // This function is called only when the user confirms the action in the modal.
  const handleConfirmEndSession = async () => {
    setShowConfirmEndSessionModal(false); // Close the modal
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        await deleteUser(auth.currentUser);
        toast.success("Guest session ended.");
      } catch (error) {
        console.error("Error deleting anonymous user:", error);
        toast.error("Failed to end session.");
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
      
      {/* The confirmation modal for ending a guest session */}
      <ConfirmationModal
        isOpen={showConfirmEndSessionModal}
        onClose={() => setShowConfirmEndSessionModal(false)}
        onConfirm={handleConfirmEndSession}
        title="End Guest Session?"
        message="This will permanently delete all your data. Are you sure?"
        confirmButtonText="Yes, End Session"
      />
      
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