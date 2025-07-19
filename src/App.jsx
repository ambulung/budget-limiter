import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Toaster, toast } from 'react-hot-toast';

import { decryptBudget } from './utils/encryption';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';
import ConfirmationModal from './components/ConfirmationModal';
import SetupModal from './components/SetupModal';

function App() {
  const [user, setUser] = useState(null);
  // Use a more descriptive loading state for initial app load vs. data fetching
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isFetchingSettings, setIsFetchingSettings] = useState(false); // New state for settings fetch

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);
  const [showConfirmDeleteAccountModal, setShowConfirmDeleteAccountModal] = useState(false);

  const [appSettings, setAppSettings] = useState({
    budget: 1000,
    currency: '$',
    numberFormat: 'comma',
    appTitle: 'My Expense Tracker',
    isNewUser: false,
  });

  // Effect 1: Listen for Auth State Changes (Primary Auth Listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); // Update user state immediately

      if (!currentUser) {
        // If no user, reset states and indicate initial load is complete
        setAppSettings({
          budget: 1000, currency: '$', numberFormat: 'comma', appTitle: 'My Expense Tracker', isNewUser: false,
        });
        setShowSetupModal(false);
        setShowConfirmEndSessionModal(false);
        setShowConfirmDeleteAccountModal(false);
        setInitialLoadComplete(true); // Initial load complete, show Login
      } else {
        // User is logged in (or just logged in). Update last activity.
        const userDocRef = doc(db, 'userSettings', currentUser.uid);
        try {
          await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true });
        } catch (error) {
          console.error("Error updating last activity on auth change:", error);
        }
        // After updating activity, the next useEffect will fetch settings
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect 2: Fetch User Settings when user changes (and handle new user flow)
  useEffect(() => {
    // This effect runs when 'user' state changes.
    // If user is null, it means we're either logged out or still waiting for auth state.
    // We only proceed if user is not null.
    if (!user) {
      // If initialLoadComplete is already true (meaning no user found), we're done.
      // If it's false, we're still waiting for auth state to settle, so keep loading.
      if (initialLoadComplete) {
        setIsFetchingSettings(false); // No settings to fetch if no user
      }
      return;
    }

    const userDocRef = doc(db, 'userSettings', user.uid);
    const fetchData = async () => {
      setIsFetchingSettings(true); // Start fetching settings
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const decryptedBudget = decryptBudget(userData.budget);
          const effectiveBudget = typeof decryptedBudget === 'number' ? decryptedBudget : 1000;

          setAppSettings({
            budget: effectiveBudget,
            currency: userData.currency || '$',
            numberFormat: userData.numberFormat || 'comma',
            appTitle: userData.appTitle || 'My Expense Tracker',
            isNewUser: false,
          });
          setShowSetupModal(false); // Ensure modal is closed for existing users

          await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true });

        } else {
          // It's a new user. Set isNewUser and trigger setup modal.
          setAppSettings(prevSettings => ({ // Use functional update
            ...prevSettings, // Keep existing defaults if any
            isNewUser: true, // Crucial for SetupModal to show welcome message
          }));
          setShowSetupModal(true); // <--- This is the key trigger for the modal

          // Create the userSettings document with initial lastActivity
          await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true });
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        toast.error("Could not load user settings.");
        // Decide how to handle errors for new users (e.g., show a generic error, or fallback to login)
        // For now, we'll still try to show the login screen.
      } finally {
        setIsFetchingSettings(false); // Settings fetch complete
        setInitialLoadComplete(true); // Indicate that the initial app data load is done
      }
    };

    fetchData();
  }, [user]); // Re-run when user changes

  const handleSaveSettings = async (settings) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'userSettings', user.uid);
      await setDoc(userDocRef, { ...settings, lastActivity: serverTimestamp() }, { merge: true });
      
      const decryptedBudgetForState = decryptBudget(settings.budget);
      const effectiveBudgetForState = typeof decryptedBudgetForState === 'number' ? decryptedBudgetForState : 1000;

      setAppSettings({
        ...settings,
        budget: effectiveBudgetForState,
        isNewUser: false // No longer a new user after saving settings
      });
      setShowSetupModal(false); // Close modal after save
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings.");
    }
  };

  const executeDeleteAccount = async () => {
    setShowConfirmDeleteAccountModal(false);

    const functions = getFunctions();
    const deleteUserAccountCallable = httpsCallable(functions, 'deleteUserAccount');

    try {
      toast.loading('Deleting your account...');
      await deleteUserAccountCallable();
      toast.dismiss();
      toast.success("Your account and all data have been deleted.");
      await signOut(auth);
    } catch (error) {
      toast.dismiss();
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account. Please try again.");
    }
  };

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

  const handleConfirmEndSession = () => {
    executeDeleteAccount();
  };

  const handleTriggerDeleteConfirmation = () => {
    setShowSetupModal(false);
    setShowConfirmDeleteAccountModal(true);
  };

  // Render loading screen until initial auth state and settings fetch are complete
  if (!initialLoadComplete || (user && isFetchingSettings)) {
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

      <ConfirmationModal
        isOpen={showConfirmDeleteAccountModal}
        onClose={() => setShowConfirmDeleteAccountModal(false)}
        onConfirm={executeDeleteAccount}
        title="Delete Your Account?"
        message="This action is permanent and will delete all your budget data and expenses. This cannot be undone."
        confirmButtonText="Yes, Delete My Account"
      />

      {user && (
        <Header
          onLogout={handleLogout}
          onOpenSettings={() => setShowSetupModal(true)}
        />
      )}

      <main className="flex-grow">
        {user ? (
          <>
            <Dashboard
              user={user}
              appSettings={appSettings}
            />
            <SetupModal
              isOpen={showSetupModal} // This is controlled by state
              onClose={() => setShowSetupModal(false)}
              onSave={handleSaveSettings}
              user={user}
              initialSettings={appSettings} // Pass current appSettings which includes isNewUser
              onDeleteAccount={handleTriggerDeleteConfirmation}
            />
          </>
        ) : (
          <Login />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;