// functions/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler"); // Import onSchedule
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth(); // Get auth instance for checking user type

/**
 * Helper function to delete a user's Firestore data (userSettings and transactions).
 * This is extracted to be reusable by both onCall and onSchedule functions.
 * @param {string} uid The user ID to delete data for.
 */
async function deleteUserFirestoreData(uid) {
  const userDocRef = db.collection("userSettings").doc(uid);
  const transactionsRef = userDocRef.collection("transactions");

  // Delete transactions subcollection
  const transactionsSnapshot = await transactionsRef.get();
  if (!transactionsSnapshot.empty) {
    const batch = db.batch();
    transactionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
  // Delete user settings document
  await userDocRef.delete();
  console.log(`Successfully deleted Firestore data for user: ${uid}`);
}

/**
 * Callable Cloud Function to delete a user's account and all associated data.
 * Triggered by the client-side when a user requests to delete their account.
 */
exports.deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to delete an account."
    );
  }

  const uid = request.auth.uid;

  try {
    // 1. Delete Firestore data
    await deleteUserFirestoreData(uid);
    
    // 2. Delete Firebase Auth user
    await admin.auth().deleteUser(uid);

    return { message: `Successfully deleted user ${uid} and all associated data.` };
  } catch (error) {
    console.error("Error deleting user account:", uid, error);
    // Provide a more user-friendly error message if it's an auth error
    if (error.code === 'auth/user-not-found') {
        throw new HttpsError("not-found", "User account not found.");
    }
    throw new HttpsError(
      "internal",
      "An error occurred while deleting the account. Please try again."
    );
  }
});

/**
 * Scheduled Cloud Function to delete inactive anonymous users.
 * Runs every 24 hours.
 */
exports.deleteInactiveAnonymousUsers = onSchedule('every 24 hours', async (context) => {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 24); // 24 hours ago (1 day)

  console.log(`Checking for anonymous users inactive since: ${cutoff.toISOString()}`);

  try {
    // 1. Query Firestore for userSettings documents with lastActivity older than cutoff
    const inactiveUsersSnapshot = await db.collection('userSettings')
      .where('lastActivity', '<', cutoff)
      .get();

    const usersToDelete = [];

    for (const doc of inactiveUsersSnapshot.docs) {
      const uid = doc.id;
      
      try {
        const userRecord = await auth.getUser(uid);
        // Check if the user is anonymous (no provider data, no email)
        // Note: Anonymous users have providerData.length === 0
        // and usually no email, but checking providerData is more robust.
        if (userRecord.providerData.length === 0) {
          console.log(`Found inactive anonymous user in Auth: ${uid}`);
          usersToDelete.push(uid);
        } else {
          // This user is not anonymous (e.g., upgraded account).
          // Update their lastActivity to prevent them from being repeatedly checked
          // if they're active but somehow slipped through a previous check.
          await db.collection('userSettings').doc(uid).update({
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`User ${uid} in Firestore is not anonymous or is active. Last activity updated.`);
        }
      } catch (authError) {
        // If getUser fails (e.g., user already deleted from Auth, or UID is invalid)
        // We should still clean up their Firestore data.
        if (authError.code === 'auth/user-not-found') {
          console.log(`Auth user ${uid} not found. Deleting associated Firestore data.`);
          usersToDelete.push(uid); // Add to list to delete Firestore data
        } else {
          console.error(`Error fetching user record for ${uid}:`, authError);
        }
      }
    }

    if (usersToDelete.length === 0) {
      console.log('No inactive anonymous users found to delete.');
      return null;
    }

    console.log(`Found ${usersToDelete.length} inactive anonymous users to delete.`);

    // 2. Delete the users from Firebase Auth and Firestore
    const deletionPromises = usersToDelete.map(async (uid) => {
      try {
        await deleteUserFirestoreData(uid); // Delete Firestore data first
        await auth.deleteUser(uid); // Then delete Auth user
        console.log(`Successfully deleted anonymous user: ${uid}`);
      } catch (error) {
        console.error(`Failed to delete user ${uid}:`, error);
      }
    });

    await Promise.allSettled(deletionPromises); // Wait for all deletions to attempt
    console.log('Finished deleting inactive anonymous users.');
    return null;

  } catch (error) {
    console.error('Error in deleteInactiveAnonymousUsers scheduled function:', error);
    return null;
  }
});