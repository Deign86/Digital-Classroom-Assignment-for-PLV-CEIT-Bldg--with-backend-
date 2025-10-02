// Script to check if admin user exists in Firestore
// Run this with: node checkAdmin.js

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPjXXxZvGyM2fIM6h1ELgD1deCKqmh44s",
  authDomain: "plv-ceit-classroom.firebaseapp.com",
  projectId: "plv-ceit-classroom",
  storageBucket: "plv-ceit-classroom.firebasestorage.app",
  messagingSenderId: "778516151085",
  appId: "1:778516151085:web:4167392e64014a7cbc71a4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkAndFixAdmin() {
  try {
    console.log('🔍 Attempting to sign in with admin@plv.edu.ph...');
    
    // Try to sign in to get the actual UID
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'admin@plv.edu.ph',
      'admin123456'
    );
    
    const uid = userCredential.user.uid;
    console.log('✅ Sign in successful!');
    console.log('📋 User UID:', uid);
    
    // Check if Firestore document exists
    console.log('\n🔍 Checking Firestore document...');
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('✅ Firestore document found:');
      console.log('   Email:', data.email);
      console.log('   Name:', data.name);
      console.log('   Role:', data.role);
      console.log('   Status:', data.status);
      console.log('   Department:', data.department);
      
      if (data.role === 'admin' && data.status === 'approved') {
        console.log('\n✅ Admin user is properly configured!');
        console.log('   You should be able to log in now.');
      } else {
        console.log('\n⚠️  User exists but needs fixing...');
        // Update the document
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', uid), {
          ...data,
          role: 'admin',
          status: 'approved',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Fixed! User now has admin role and approved status.');
      }
    } else {
      console.log('❌ Firestore document NOT found!');
      console.log('   Creating it now...');
      
      const { setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', uid), {
        email: 'admin@plv.edu.ph',
        name: 'System Administrator',
        role: 'admin',
        status: 'approved',
        department: 'Registrar',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Firestore document created successfully!');
    }
    
    console.log('\n🎉 All done! Try logging in again.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.code || error.message);
    
    if (error.code === 'auth/wrong-password') {
      console.log('\n⚠️  The password is incorrect.');
      console.log('   If you forgot the password, you can reset it in Firebase Console.');
    } else if (error.code === 'auth/user-not-found') {
      console.log('\n⚠️  User not found in Firebase Authentication.');
      console.log('   Please create the user in Firebase Console first.');
    }
    
    process.exit(1);
  }
}

checkAndFixAdmin();
