// src/utils/encryption.js

import CryptoJS from 'crypto-js';
import { toast } from 'react-hot-toast'; // Assuming you have toast available globally or pass it

// IMPORTANT: This key MUST be the same as the one used for encryption.
// It's loaded from the environment variable.
const ENCRYPTION_SECRET_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

// Optional: Add a warning in development if the key isn't set
if (process.env.NODE_ENV === 'development' && !ENCRYPTION_SECRET_KEY) {
  console.warn("WARNING: REACT_APP_ENCRYPTION_KEY is not set. Encryption/Decryption might not function correctly.");
}

// Helper function to encrypt a number
export const encryptBudget = (budget, key = ENCRYPTION_SECRET_KEY) => {
  if (typeof budget !== 'number' || !key) {
    console.error("Encryption failed: Budget must be a number and key must be provided.");
    toast.error("Failed to encrypt budget data."); // Using toast here
    return null;
  }
  try {
    return CryptoJS.AES.encrypt(budget.toString(), key).toString();
  } catch (error) {
    console.error("Error during encryption:", error);
    toast.error("Error encrypting budget.");
    return null;
  }
};

// Helper function to decrypt an encrypted string back to a number
export const decryptBudget = (encryptedBudget, key = ENCRYPTION_SECRET_KEY) => {
  if (!encryptedBudget || typeof encryptedBudget !== 'string' || !key) {
    // console.warn("Decryption skipped: Encrypted budget is invalid or key is missing.");
    return null; // Return null if there's nothing to decrypt or key is missing
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedBudget, key);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      console.warn("Decryption resulted in empty string. Data might be corrupted or key is wrong.");
      return null;
    }

    const parsedValue = parseFloat(decryptedText);
    if (isNaN(parsedValue)) {
      console.warn("Decrypted text is not a valid number:", decryptedText);
      return null;
    }
    return parsedValue;
  } catch (error) {
    console.error("Error during decryption:", error);
    toast.error("Failed to decrypt budget. Data might be corrupted or key is wrong.");
    return null;
  }
};