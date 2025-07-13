// src/App.jsx

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc } from "firebase/firestore";
import { Toaster, toast } from 'react-hot-toast';

// Component Imports
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';
import ConfirmationModal from './components/ConfirmationModal';

// REMOVED: DEFAULT_ICON_URL constant

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);

  // MODIFIED: appSettings state no longer includes appIcon
  const [appSettings, setAppSettings] = useState({
    budget: 1000,
    currency: '$',
    numberFormat: 'comma',
    appTitle: 'My Expense Tracker', // Default title
    // REMOVED: appIcon property
  });

  // Effect to listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        // MODIFIED: Reset appSettings to initial defaults without appIcon
        setAppSettings({
          budget: 1000,
          currency: '$',
          numberFormat: 'comma',
          appTitle: 'My Expense Tracker',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect to fetch user-specific settings from Firestore
  useEffect(() => {
    if (!user) {
      return;
    };

    const userDocRef = doc(db, 'users', user.uid);
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          // MODIFIED: Update all relevant settings, but do NOT expect appIcon from Firestore
          setAppSettings({
            budget: userData.budget || 1000,
            currency: userData.currency || '$',
            numberFormat: userData.numberFormat || 'comma',
            appTitle: userData.appTitle || 'My Expense Tracker', // Fetch title
            // REMOVED: appIcon property from userData
          });
        } else {
          // If doc doesn't exist, reset to defaults without appIcon
          setAppSettings({
            budget: 1000,
            currency: '$',
            numberFormat: 'comma',
            appTitle: 'My Expense Tracker',
          });
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        toast.error("Could not load user settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Logout and session handling logic
  const handleLogout = () => {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      setShowConfirmEndSessionModal(true);
    } else {
      signOut(auth).catch(error => {
        console.error("Logout error:", error);
        toast.error("Failed to log out.");
      });
    }
  };

  const handleConfirmEndSession = async () => {
    setShowConfirmEndSessionModal(false);
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        await deleteUser(auth.currentUser);
        toast.success("Guest session ended and data deleted.");
      } catch (error) {
        console.error("Error deleting anonymous user:", error);
        toast.error("Failed to end guest session.");
      }
    }
  };

  // Loading screen
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

      <ConfirmationModal
        isOpen={showConfirmEndSessionModal}
        onClose={() => setShowConfirmEndSessionModal(false)}
        onConfirm={handleConfirmEndSession}
        title="End Guest Session?"
        message="This will permanently delete all your data. Are you sure you want to continue?"
        confirmButtonText="Yes, End Session"
      />

      {user && (
        <Header
          onLogout={handleLogout}
          onOpenSettings={() => setShowSetupModal(true)}
        />
      )}

      <main className="flex-grow">
        {user ? (
          <Dashboard
            user={user}
            showSetupModal={showSetupModal}
            setShowSetupModal={setShowSetupModal}
            appSettings={appSettings} // appSettings no longer includes appIcon
            updateAppSettings={setAppSettings}
            // REMOVED: appIcon prop
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