#!/usr/bin/env node

/**
 * Server-side migration script to set custom claims for existing admin users
 * 
 * Prerequisites:
 * - Firebase Admin SDK service account credentials
 * - Set FIREBASE_ADMIN_SA_JSON or FIREBASE_ADMIN_SA_PATH environment variable
 * 
 * Usage:
 *   node migrate-custom-claims-server.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
try {
  const saJson = process.env.FIREBASE_ADMIN_SA_JSON;
  const saPath = process.env.FIREBASE_ADMIN_SA_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (saJson) {
    const serviceAccount = JSON.parse(saJson);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('✅ Initialized using FIREBASE_ADMIN_SA_JSON');
  } else if (saPath && fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`✅ Initialized using service account at ${saPath}`);
  } else {
    admin.initializeApp();
    console.log('✅ Initialized using default credentials');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

async function setCustomClaimsForUser(userId, role) {
  const claims = {
    role: role || 'faculty',
  };

  if (role === 'admin') {
    claims.admin = true;
  }

  await admin.auth().setCustomUserClaims(userId, claims);
  return claims;
}

async function migrateExistingAdmins() {
  console.log('🚀 Starting custom claims migration for existing admins...\n');

  try {
    // Get all admin users from Firestore
    console.log('📋 Fetching admin users from Firestore...');
    const usersSnapshot = await db.collection('users').where('role', '==', 'admin').get();

    console.log(`Found ${usersSnapshot.size} admin users\n`);

    if (usersSnapshot.empty) {
      console.log('❌ No admin users found in Firestore.');
      console.log('Make sure you have users with role="admin" in your users collection.');
      return;
    }

    const results = [];

    // Process each admin user
    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      const name = userData.name || userData.email || 'Unknown';

      console.log(`⚙️  Processing: ${name} (${userId})`);

      try {
        // Set custom claims
        const claims = await setCustomClaimsForUser(userId, userData.role);
        console.log(`   ✅ Claims set:`, claims);
        
        results.push({ 
          userId, 
          name, 
          success: true, 
          claims 
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
    console.log('=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY\n');
    console.log(`Total admin users: ${usersSnapshot.size}`);
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
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateExistingAdmins()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
