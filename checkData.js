// Script to check what data exists in Firestore
// Run this with: node checkData.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkData() {
  try {
    console.log('📊 Checking Firestore data...\n');
    
    // Check users collection
    console.log('👥 Users Collection:');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`   Found ${usersSnapshot.size} user(s)`);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.email} (${data.role}, ${data.status})`);
    });
    
    // Check signupRequests collection
    console.log('\n📝 Signup Requests Collection:');
    const signupSnapshot = await getDocs(collection(db, 'signupRequests'));
    console.log(`   Found ${signupSnapshot.size} signup request(s)`);
    signupSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.email} (${data.status}) - ${data.requestDate}`);
    });
    
    // Check classrooms collection
    console.log('\n🏫 Classrooms Collection:');
    const classroomsSnapshot = await getDocs(collection(db, 'classrooms'));
    console.log(`   Found ${classroomsSnapshot.size} classroom(s)`);
    
    // Check bookingRequests collection
    console.log('\n📅 Booking Requests Collection:');
    const bookingSnapshot = await getDocs(collection(db, 'bookingRequests'));
    console.log(`   Found ${bookingSnapshot.size} booking request(s)`);
    
    // Check schedules collection
    console.log('\n🗓️  Schedules Collection:');
    const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
    console.log(`   Found ${schedulesSnapshot.size} schedule(s)`);
    
    console.log('\n✅ Data check complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
