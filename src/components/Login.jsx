import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signInAnonymously
} from 'firebase/auth';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

// --- SVG Icons for Password Toggle ---
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeSlashedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

// --- SVG Icon for Guest Mode ---
const GuestIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGuestLogin = async () => {
    if (isProcessing) return;
    setProcessingAction('guest');
    setIsProcessing(true);
    setError('');

    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Guest login error:", err);
      setError('Failed to start guest session. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleGoogleLogin = async () => {
    if (isProcessing) return;
    setProcessingAction('google');
    setIsProcessing(true);
    setError('');

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setProcessingAction('email');
    setIsProcessing(true);
    setError('');

    try {
      if (!email.includes('@') || !email.split('@')[1]?.includes('.')) {
        throw new Error('Please enter a full email address.');
      }

      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        switch (err.code) {
          case 'auth/invalid-credential':
            setError('Incorrect email or password.');
            break;
          case 'auth/email-already-in-use':
            setError('This email address is already in use.');
            break;
          case 'auth/weak-password':
            setError('Password must be at least 6 characters.');
            break;
          default:
            setError('An error occurred. Please try again.');
        }
      }
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-gray-900 p-4">
      
      <h2 className="text-3xl font-bold text-center text-white tracking-widest mb-6">
        BUDGET.LIMIT
      </h2>
      
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
          {isLoginView ? 'Welcome Back!' : 'Create an Account'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          {isLoginView ? 'Sign in to access your budget.' : 'Get started by creating your account.'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeSlashedIcon /> : <EyeIcon />}
            </button>
          </div>
          
          {!isLoginView && (
            <>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  required
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                 <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashedIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            className="w-full p-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:bg-blue-400 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            {isProcessing && processingAction === 'email' ? 'Processing...' : (isLoginView ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isLoginView ? "Don't have an account?" : 'Already have an account?'}
            <button 
              onClick={() => { 
                if (isProcessing) return;
                setIsLoginView(!isLoginView); 
                setError(''); 
              }} 
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-1"
            >
              {isLoginView ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="mx-4 text-sm text-gray-500 dark:text-gray-400">OR</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        
        <div className="space-y-3">
            <button 
            onClick={handleGoogleLogin} 
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
            >
                <svg className="w-6 h-6" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 9.92C34.553 6.186 29.65 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.841-5.841C34.553 6.186 29.65 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.443-2.343 4.465-4.542 5.856l6.19 5.238C42.012 35.836 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
                </svg>
                {isProcessing && processingAction === 'google' ? 'Opening...' : 'Sign in with Google'}
            </button>
            
            <button 
            onClick={handleGuestLogin} 
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
            >
                <GuestIcon />
                {isProcessing && processingAction === 'guest' ? 'Signing in...' : 'Continue as Guest'}
            </button>
        </div>

        {/* --- NEW: Guest Disclaimer --- */}
        <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400 italic">
          Please note: Guest accounts are temporary. Data will be deleted after 30 days of inactivity.
        </p>

      </div>
    </div>
  );
};

export default Login;