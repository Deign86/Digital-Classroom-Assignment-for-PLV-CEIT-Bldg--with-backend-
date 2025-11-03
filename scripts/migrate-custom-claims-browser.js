/**
 * Client-side migration script using Firebase callable functions
 * Run this in the browser console when signed in as an admin
 * 
 * This script calls the setUserCustomClaims function for all admin users
 */

async function migrateCustomClaimsViaCallable() {
  console.log('🚀 Starting custom claims migration via callable functions...\n');

  try {
    // Get Firebase instances
    const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { getAuth } = await import('firebase/auth');
    
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
    throw error;
  }
}

// Auto-execute when loaded
console.log('Migration script loaded. Run: await migrateCustomClaimsViaCallable()');
