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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmEndSessionModal, setShowConfirmEndSessionModal] = useState(false);

  const [appSettings, setAppSettings] = useState({
    budget: 1000,
    currency: '$',
    numberFormat: 'comma',
    appTitle: 'My Expense Tracker',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
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
          setAppSettings({
            budget: userData.budget || 1000,
            currency: userData.currency || '$',
            numberFormat: userData.numberFormat || 'comma',
            appTitle: userData.appTitle || 'My Expense Tracker',
          });
        } else {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    // This div already has min-h-screen and flex flex-col, which is good
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

      {/* --- MODIFIED: Added flex-grow to the main element --- */}
      <main className="flex-grow">
        {user ? (
          <Dashboard
            user={user}
            showSetupModal={showSetupModal}
            setShowSetupModal={setShowSetupModal}
            appSettings={appSettings}
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