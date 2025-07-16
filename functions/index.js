// functions/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to delete an account."
    );
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    const userDocRef = db.collection("userSettings").doc(uid);
    const transactionsRef = userDocRef.collection("transactions");
    const transactionsSnapshot = await transactionsRef.get();

    if (!transactionsSnapshot.empty) {
        const batch = db.batch();
        transactionsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }
    
    await userDocRef.delete();
    await admin.auth().deleteUser(uid);

    return { message: `Successfully deleted user ${uid} and all associated data.` };
  } catch (error) {
    console.error("Error deleting user account:", uid, error);
    throw new HttpsError(
      "internal",
      "An error occurred while deleting the account."
    );
  }
});