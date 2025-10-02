// Quick script to create admin user in Firestore
// Run this with: node createAdmin.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Your Firebase config from .env
const firebaseConfig = {
  apiKey: "AIzaSyCPjXXxZvGyM2fIM6h1ELgD1deCKqmh44s",
  authDomain: "plv-ceit-classroom.firebaseapp.com",
  projectId: "plv-ceit-classroom",
  storageBucket: "plv-ceit-classroom.firebasestorage.app",
  messagingSenderId: "778516151085",
  appId: "1:778516151085:web:4167392e64014a7cbc71a4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// The User UID from Firebase Authentication for admin@plv.edu.ph
const ADMIN_UID = "KRF7sXaf0uRvexZpy9JW9uKosSi2";

async function createAdminUser() {
  try {
    console.log('Creating admin user document in Firestore...');
    
    await setDoc(doc(db, 'users', ADMIN_UID), {
      email: 'admin@plv.edu.ph',
      name: 'System Administrator',
      role: 'admin',
      status: 'approved',
      department: 'Registrar',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('You can now login with:');
    console.log('  Email: admin@plv.edu.ph');
    console.log('  Password: admin123456');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
