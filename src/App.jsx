import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"; // Import serverTimestamp
import { getFunctions, httpsCallable } from "firebase/functions";
import { Toaster, toast } from 'react-hot-toast';

// Import the decryptBudget function from your new utility file
import { decryptBudget } from './utils/encryption';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';
import ConfirmationModal from './components/ConfirmationModal';
import SetupModal from './components/SetupModal'; // Ensure SetupModal is imported

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);
  const [showConfirmDeleteAccountModal, setShowConfirmDeleteAccountModal] = useState(false);

  const [appSettings, setAppSettings] = useState({
    budget: 1000,
    currency: '$',
    numberFormat: 'comma',
    appTitle: 'My Expense Tracker',
    isNewUser: false, // Default to false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
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
        // This is important for the anonymous user cleanup function
        const userDocRef = doc(db, 'userSettings', currentUser.uid);
        setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true })
          .catch(error => console.error("Error updating last activity on auth change:", error));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
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
            isNewUser: false, // Existing user, so not new
          });
          setShowSetupModal(false);

          // Update lastActivity when fetching/loading settings for an existing user
          await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true });

        } else {
          // If no settings exist, it's a new user.
          // Set isNewUser to true and show the setup modal.
          setAppSettings({
            budget: 1000, // Default for new user
            currency: '$', // Default for new user
            numberFormat: 'comma', // Default for new user
            appTitle: 'My Expense Tracker', // Default for new user
            isNewUser: true, // THIS IS THE KEY FLAG
          });
          setShowSetupModal(true); // Show the setup modal for new users

          // For new users (including new anonymous users), set initial lastActivity
          // This also creates the userSettings document if it doesn't exist
          await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true });
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        toast.error("Could not load user settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]); // Re-run when user changes

  const handleSaveSettings = async (settings) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'userSettings', user.uid);
      // Merge new settings and update lastActivity
      await setDoc(userDocRef, { ...settings, lastActivity: serverTimestamp() }, { merge: true });
      
      // Update appSettings state with the *decrypted* budget for immediate use in app
      const decryptedBudgetForState = decryptBudget(settings.budget);
      const effectiveBudgetForState = typeof decryptedBudgetForState === 'number' ? decryptedBudgetForState : 1000;

      setAppSettings({
        ...settings,
        budget: effectiveBudgetForState, // Set the decrypted budget here
        isNewUser: false // Once settings are saved, they are no longer a "new user"
      });
      setShowSetupModal(false);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings.");
    }
  };

  const executeDeleteAccount = async () => {
    setShowConfirmDeleteAccountModal(false); // Hide the confirmation modal immediately

    const functions = getFunctions();
    const deleteUserAccountCallable = httpsCallable(functions, 'deleteUserAccount');

    try {
      toast.loading('Deleting your account...');
      await deleteUserAccountCallable();
      toast.dismiss();
      toast.success("Your account and all data have been deleted.");
      // Explicitly sign out, though auth state listener should also handle it
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
      }
      );
    }
  };

  const handleConfirmEndSession = () => {
    // For guest users, ending session means deleting account
    executeDeleteAccount();
  };

  const handleTriggerDeleteConfirmation = () => {
    setShowSetupModal(false); // Close the SetupModal first
    setShowConfirmDeleteAccountModal(true); // Open the specific delete confirmation modal
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
              isOpen={showSetupModal}
              onClose={() => setShowSetupModal(false)}
              onSave={handleSaveSettings}
              user={user}
              initialSettings={appSettings} // Pass current appSettings as initialSettings
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