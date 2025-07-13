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

// ADDED: Default icon URL. Make sure this path is correct for your project.
// You might want to place a default image in your `public` folder or `src/assets`.
const DEFAULT_ICON_URL = '/default-app-icon.jpg'; // Example path, adjust as needed

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);

  // MODIFIED: Re-added appTitle to initial state for clarity, and added appIcon.
  // appIcon will be updated from fetched data or use a default.
  const [appSettings, setAppSettings] = useState({
    budget: 1000,
    currency: '$',
    numberFormat: 'comma',
    appTitle: 'My Expense Tracker', // Default title
    appIcon: DEFAULT_ICON_URL, // Default icon
  });

  // Effect to listen for authentication state changes (no changes needed here)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        // MODIFIED: Reset appSettings to initial defaults on logout
        setAppSettings({
          budget: 1000,
          currency: '$',
          numberFormat: 'comma',
          appTitle: 'My Expense Tracker',
          appIcon: DEFAULT_ICON_URL,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect to fetch user-specific settings from Firestore
  useEffect(() => {
    if (!user) {
      // Already handled in onAuthStateChanged for logout case, but good to have a safeguard
      return;
    };

    const userDocRef = doc(db, 'users', user.uid);
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          // MODIFIED: Update all relevant settings including appTitle and appIcon
          setAppSettings({
            budget: userData.budget || 1000,
            currency: userData.currency || '$',
            numberFormat: userData.numberFormat || 'comma',
            appTitle: userData.appTitle || 'My Expense Tracker', // Fetch title
            appIcon: userData.appIcon || DEFAULT_ICON_URL, // Fetch icon URL
          });
          // If this is a new user setup, the modal will be handled by Dashboard's useEffect
        } else {
          // If doc doesn't exist, it's a new user or data was somehow lost.
          // Reset to defaults and potentially show setup modal.
          // The Dashboard's useEffect will handle `setShowSetupModal(true)` for new users.
          setAppSettings({
            budget: 1000,
            currency: '$',
            numberFormat: 'comma',
            appTitle: 'My Expense Tracker',
            appIcon: DEFAULT_ICON_URL,
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
  }, [user]); // Depend on user to refetch settings when user changes

  // Logout and session handling logic (no changes needed here)
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

  // Loading screen (no changes needed here)
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
        // Header no longer needs appTitle or appIcon props.
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
            appSettings={appSettings} // appSettings now includes appTitle
            updateAppSettings={setAppSettings}
            appIcon={appSettings.appIcon} // Pass appIcon from appSettings
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