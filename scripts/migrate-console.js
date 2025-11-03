/**
 * Browser console migration script - Works with already loaded Firebase app
 * 
 * Prerequisites:
 * 1. Be signed in to the app as an admin
 * 2. Paste this entire script into the browser console
 * 3. Run: await migrateCustomClaimsViaCallable()
 */

async function migrateCustomClaimsViaCallable() {
  console.log('🚀 Starting custom claims migration via callable functions...\n');

  try {
    // Use the Firebase app that's already loaded in your application
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
    
    const auth = getAuth();
    const db = getFirestore();
    const functions = getFunctions();

    // Check if user is signed in
    if (!auth.currentUser) {
      console.error('❌ Not signed in. Please sign in as an admin first.');
      return;
    }

    console.log(`✅ Signed in as: ${auth.currentUser.email}`);
    console.log('📋 Fetching admin users from Firestore...\n');

    // Get all admin users
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('role', '==', 'admin'));
    const snapshot = await getDocs(adminQuery);

    console.log(`Found ${snapshot.size} admin users\n`);

    if (snapshot.empty) {
      console.log('❌ No admin users found in Firestore.');
      return;
    }

    // Get the callable function
    const setUserCustomClaims = httpsCallable(functions, 'setUserCustomClaims');

    const results = [];

    // Process each admin user
    for (const doc of snapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      const name = userData.name || userData.email || 'Unknown';

      console.log(`⚙️  Processing: ${name} (${userId})`);

      try {
        const result = await setUserCustomClaims({ userId });
        console.log(`   ✅ Success:`, result.data);
        
        results.push({ 
          userId, 
          name, 
          success: true, 
          claims: result.data.claims 
        });
      } catch (error) {
        console.error(`   ❌ Failed:`, error.message);
        
        results.push({ 
          userId, 
          name, 
          success: false, 
          error: error.message 
        });
      }

      console.log('');
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('📊 MIGRATION SUMMARY\n');
    console.log(`Total admin users: ${snapshot.size}`);
    console.log(`Successfully updated: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);

    if (results.some(r => !r.success)) {
      console.log('\n⚠️  Failed migrations:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.name} (${r.userId}): ${r.error}`);
      });
    }

    console.log('\n✅ Migration completed!');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. All admin users must sign out and sign in again');
    console.log('   2. Verify custom claims by checking token in browser console:');
    console.log('      const auth = getAuth();');
    console.log('      const result = await auth.currentUser.getIdTokenResult();');
    console.log('      console.log(result.claims);');
    console.log('='.repeat(60));

    return results;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Auto-execute message
console.log('✅ Migration script loaded successfully!');
console.log('📋 To run the migration, execute: await migrateCustomClaimsViaCallable()');
