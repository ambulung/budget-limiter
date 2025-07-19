import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from './firebase'; // Ensure 'db' is imported
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Toaster, toast } from 'react-hot-toast';

// Import the decryptBudget function from your new utility file
import { decryptBudget } from './utils/encryption';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Footer from './components/Footer';
import ConfirmationModal from './components/ConfirmationModal';
import SetupModal from './components/SetupModal';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);
  const [showConfirmDeleteAccountModal, setShowConfirmDeleteAccountModal] = useState(false);

  const [appSettings, setAppSettings] = useState({
    budget: 1000, // Default for new users or when logged out
    currency: '$',
    numberFormat: 'comma',
    appTitle: 'My Expense Tracker',
    isNewUser: false, // Flag to indicate if it's a new user session
  });

  // Auth state listener
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
        setShowSetupModal(false); // Ensure modal is closed on logout
        setShowConfirmEndSessionModal(false);
        setShowConfirmDeleteAccountModal(false);
      }
      // The settings fetch for a logged-in user is handled by the next useEffect
    });
    return () => unsubscribe();
  }, []);

  // Fetch user settings when user state changes (login/logout)
  useEffect(() => {
    if (!user) {
      setLoading(false); // Stop loading if no user is present
      return;
    }

    const userDocRef = doc(db, 'userSettings', user.uid);
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          // Existing user: Load settings
          const userData = docSnap.data();

          // Attempt to decrypt the budget when fetching it from Firestore
          const decryptedBudget = decryptBudget(userData.budget);
          // Use the decrypted budget, or fallback to 1000 if decryption fails or data is missing
          const effectiveBudget = typeof decryptedBudget === 'number' ? decryptedBudget : 1000;

          setAppSettings({
            budget: effectiveBudget, // Use the decrypted/effective budget
            currency: userData.currency || '$',
            numberFormat: userData.numberFormat || 'comma',
            appTitle: userData.appTitle || 'My Expense Tracker',
            isNewUser: false, // Definitely not a new user if doc exists
          });
          setShowSetupModal(false); // Ensure modal is closed for existing users
        } else {
          // New user: No settings document found, show setup modal
          setAppSettings({
            budget: 1000,
            currency: '$',
            numberFormat: 'comma',
            appTitle: 'My Expense Tracker',
            isNewUser: true, // Flag as new user
          });
          setShowSetupModal(true); // Open setup modal for new user
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
        toast.error("Could not load user settings.");
      } finally {
        setLoading(false); // Stop loading once data fetch attempt is complete
      }
    };

    fetchData();
  }, [user]); // Re-run this effect whenever the 'user' object changes

  const handleSaveSettings = async (settings) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'userSettings', user.uid);
      // 'settings' object received here already has the encrypted budget from SetupModal
      await setDoc(userDocRef, settings, { merge: true });
      
      // Update appSettings state with the *decrypted* budget for immediate use in app
      // This is necessary because the Dashboard needs the actual number, not the encrypted string.
      const decryptedBudgetForState = decryptBudget(settings.budget);
      const effectiveBudgetForState = typeof decryptedBudgetForState === 'number' ? decryptedBudgetValue : 1000;

      setAppSettings({
        ...settings,
        budget: effectiveBudgetForState, // Set the decrypted budget here
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
    setShowConfirmDeleteAccountModal(false); // Hide the confirmation modal immediately

    const functions = getFunctions();
    const deleteUserAccountCallable = httpsCallable(functions, 'deleteUserAccount');

    try {
      toast.loading('Deleting your account...');
      await deleteUserAccountCallable(); // Call your Cloud Function
      toast.dismiss(); // Dismiss loading toast
      toast.success("Your account and all data have been deleted.");
      // Explicitly sign out, though auth state listener should also handle it
      await signOut(auth);
    } catch (error) {
      toast.dismiss(); // Dismiss loading toast
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account. Please try again.");
    }
  };

  const handleLogout = () => {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      // For anonymous users, logout means deleting the account
      setShowConfirmEndSessionModal(true);
    } else {
      // For authenticated users, just sign out
      signOut(auth).catch(error => {
        console.error("Logout error:", error);
        toast.error("Failed to log out.");
      });
    }
  };

  const handleConfirmEndSession = () => {
    // This is called when an anonymous user confirms ending their session
    executeDeleteAccount();
  };

  const handleTriggerDeleteConfirmation = () => {
    // This is called from SetupModal to initiate the delete account flow
    setShowSetupModal(false); // Close the SetupModal first
    setShowConfirmDeleteAccountModal(true); // Open the specific delete confirmation modal
  };

  // Show a loading spinner/message while checking auth state and fetching settings
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

      {/* Confirmation Modal for Anonymous User Session End */}
      <ConfirmationModal
        isOpen={showConfirmEndSessionModal}
        onClose={() => setShowConfirmEndSessionModal(false)}
        onConfirm={handleConfirmEndSession}
        title="End Guest Session?"
        message="This will permanently delete all your data. Are you sure you want to continue?"
        confirmButtonText="Yes, End Session"
      />

      {/* Confirmation Modal for Permanent Account Deletion */}
      <ConfirmationModal
        isOpen={showConfirmDeleteAccountModal}
        onClose={() => setShowConfirmDeleteAccountModal(false)}
        onConfirm={executeDeleteAccount}
        title="Delete Your Account?"
        message="This action is permanent and will delete all your budget data and expenses. This cannot be undone."
        confirmButtonText="Yes, Delete My Account"
      />

      {/* Header is only shown if a user is logged in */}
      {user && (
        <Header
          onLogout={handleLogout}
          onOpenSettings={() => setShowSetupModal(true)}
        />
      )}

      <main className="flex-grow">
        {user ? (
          <>
            {/* Dashboard is shown if a user is logged in */}
            <Dashboard
              user={user}
              appSettings={appSettings}
              // Pass setShowSetupModal to Dashboard if Dashboard needs to trigger it
              setShowSetupModal={setShowSetupModal} 
            />
            {/* SetupModal is controlled by showSetupModal state */}
            <SetupModal
              isOpen={showSetupModal}
              onClose={() => setShowSetupModal(false)}
              onSave={handleSaveSettings}
              user={user}
              initialSettings={appSettings}
              onDeleteAccount={handleTriggerDeleteConfirmation}
            />
          </>
        ) : (
          // Login component is shown if no user is logged in
          <Login />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;