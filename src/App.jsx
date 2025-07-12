// src/App.jsx

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { auth, db } from './firebase'; // Make sure to import db
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { Toaster, toast } from 'react-hot-toast';

// Component Imports
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';
import ConfirmationModal from './components/ConfirmationModal';

// A default icon to use as a fallback
const DEFAULT_ICON_URL = '/default-icon.jpg';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);

  // State to hold the settings that are shared between Header and Dashboard
  const [appSettings, setAppSettings] = useState({
    budget: 1000,
    currency: '$',
    appTitle: 'Budget', // A generic default title before user loads
    appIcon: DEFAULT_ICON_URL,
    numberFormat: 'comma',
  });

  // Effect to listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // If there's no user, we can stop the main loading process
      if (!currentUser) {
        setLoading(false);
      }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Effect to fetch user-specific settings from Firestore when the user logs in
  useEffect(() => {
    // If there is no user, reset settings to default and do nothing else
    if (!user) {
        setAppSettings({
            budget: 1000,
            currency: '$',
            appTitle: 'Budget',
            appIcon: DEFAULT_ICON_URL,
            numberFormat: 'comma',
        });
        return;
    };

    // If there IS a user, fetch their settings
    const userDocRef = doc(db, 'users', user.uid);
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          // If the user has a document, use their saved settings
          const userData = docSnap.data();
          setAppSettings({
            budget: userData.budget || 1000,
            currency: userData.currency || '$',
            appTitle: userData.appTitle || `${user.displayName}'s Budget`,
            appIcon: userData.appIcon || user.photoURL || DEFAULT_ICON_URL,
            numberFormat: userData.numberFormat || 'comma',
          });
        } else {
          // If it's a new user, create default settings based on their auth profile
          setAppSettings(prev => ({
              ...prev,
              appTitle: `${user.displayName}'s Budget`,
              appIcon: user.photoURL || DEFAULT_ICON_URL,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        toast.error("Could not load user settings.");
      } finally {
        // Stop the loading indicator once data has been fetched (or failed)
        setLoading(false);
      }
    };

    fetchData();
  }, [user]); // This effect re-runs whenever the `user` object changes

  // Triggers the confirmation modal for guests or signs out regular users
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

  // Called from the modal to delete the guest user's data and session
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

  // Display a loading screen while checking auth state and fetching data
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
      
      {/* The modal for confirming the end of a guest session */}
      <ConfirmationModal
        isOpen={showConfirmEndSessionModal}
        onClose={() => setShowConfirmEndSessionModal(false)}
        onConfirm={handleConfirmEndSession}
        title="End Guest Session?"
        message="This will permanently delete all your data. Are you sure you want to continue?"
        confirmButtonText="Yes, End Session"
      />
      
      {/* The Header is only shown when a user is logged in */}
      {/* It receives the dynamic title and icon from the `appSettings` state */}
      {user && (
        <Header 
          onLogout={handleLogout} 
          onOpenSettings={() => setShowSetupModal(true)} 
          appTitle={appSettings.appTitle}
          appIcon={appSettings.appIcon}
        />
      )}
      
      <main className="flex-grow">
        {user ? (
          <Dashboard 
            user={user} 
            showSetupModal={showSetupModal} 
            setShowSetupModal={setShowSetupModal}
            // Pass the settings down to the Dashboard
            appSettings={appSettings}
            // Pass the state setter function so the Dashboard can update the settings
            updateAppSettings={setAppSettings}
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