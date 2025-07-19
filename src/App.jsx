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
  const [loading, setLoading] = useState(true); // Keep loading true initially
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

  // Effect 1: Listen for Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false); // Only set loading false if no user is found
        // Reset settings to default if no user is logged in
        setAppSettings({
          budget: 1000,
          currency: '$',
          numberFormat: 'comma',
          appTitle: 'My Expense Tracker',
          isNewUser: false,
        });
        setShowSetupModal(false);
        setShowConfirmEndSessionModal(false);
        setShowConfirmDeleteAccountModal(false);
      } else {
        // Update lastActivity on any auth state change (login, refresh)
        const userDocRef = doc(db, 'userSettings', currentUser.uid);
        setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true })
          .catch(error => console.error("Error updating last activity on auth change:", error));
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect 2: Fetch User Settings when user changes
  useEffect(() => {
    if (!user) {
      // If user becomes null, ensure loading is false (handled by Effect 1 too)
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'userSettings', user.uid);
    const fetchData = async () => {
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
          // It's a new user, set isNewUser and show setup modal
          setAppSettings({
            budget: 1000,
            currency: '$',
            numberFormat: 'comma',
            appTitle: 'My Expense Tracker',
            isNewUser: true, // Crucial for SetupModal to show welcome message
          });
          setShowSetupModal(true); // <--- This will now trigger the modal to open

          // Create the userSettings document with initial lastActivity
          await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true });
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        toast.error("Could not load user settings.");
      } finally {
        // Only set loading to false AFTER all settings logic is complete
        setLoading(false);
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
      setShowSetupModal(false);
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