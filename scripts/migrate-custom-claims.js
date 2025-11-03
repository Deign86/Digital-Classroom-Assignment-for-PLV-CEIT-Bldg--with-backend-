/**
 * One-time migration script to set custom claims for existing admin users
 * 
 * Run this in the browser console after logging in as an admin:
 * 1. Open the app in your browser
 * 2. Sign in as an admin user
 * 3. Open Developer Console (F12)
 * 4. Copy and paste this entire script
 * 5. Run: await migrateExistingAdmins()
 */

async function migrateExistingAdmins() {
  console.log('🚀 Starting custom claims migration for existing admins...');
  
  // Import required Firebase services
  const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
  const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  
  try {
    const app = getApp();
    const db = getFirestore(app);
    const functions = getFunctions(app);
    
    // Get all admin users from Firestore
    console.log('📋 Fetching admin users...');
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminQuery);
    
    console.log(`Found ${adminSnapshot.size} admin users`);
    
    if (adminSnapshot.empty) {
      console.log('❌ No admin users found. Make sure you have admin users in your Firestore database.');
      return;
    }
    
    // Set custom claims for each admin
    const setUserCustomClaims = httpsCallable(functions, 'setUserCustomClaims');
    const results = [];
    
    for (const doc of adminSnapshot.docs) {
      const adminId = doc.id;
      const adminData = doc.data();
      
      console.log(`⚙️  Setting claims for admin: ${adminData.name || adminData.email} (${adminId})`);
      
      try {
        const result = await setUserCustomClaims({ userId: adminId });
        console.log(`   ✅ Success:`, result.data);
        results.push({ id: adminId, success: true, data: result.data });
      } catch (error) {
        console.error(`   ❌ Failed:`, error);
        results.push({ id: adminId, success: false, error: error.message });
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Total admins: ${adminSnapshot.size}`);
    console.log(`   Successful: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    
    if (results.some(r => !r.success)) {
      console.log('\n⚠️  Some migrations failed. Check the errors above.');
    } else {
      console.log('\n✅ All admin users have been migrated successfully!');
      console.log('\n⚠️  IMPORTANT: All admin users need to sign out and sign in again for changes to take effect.');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

console.log('✨ Custom Claims Migration Script Loaded');
console.log('📝 Run: await migrateExistingAdmins()');
