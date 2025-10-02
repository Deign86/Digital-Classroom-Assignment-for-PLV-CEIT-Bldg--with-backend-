// Script to add example classrooms to Firestore
// Run this with: node addClassrooms.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

const exampleClassrooms = [
  {
    name: "CEIT-101",
    capacity: 40,
    equipment: ["Projector", "Whiteboard", "Air Conditioning", "Computer"],
    building: "CEIT Building",
    floor: 1,
    isAvailable: true
  },
  {
    name: "CEIT-102",
    capacity: 35,
    equipment: ["TV", "Whiteboard", "Air Conditioning"],
    building: "CEIT Building",
    floor: 1,
    isAvailable: true
  },
  {
    name: "CEIT-201",
    capacity: 50,
    equipment: ["Projector", "Smartboard", "Air Conditioning", "Sound System"],
    building: "CEIT Building",
    floor: 2,
    isAvailable: true
  },
  {
    name: "CEIT-202",
    capacity: 45,
    equipment: ["Projector", "Whiteboard", "Air Conditioning"],
    building: "CEIT Building",
    floor: 2,
    isAvailable: true
  },
  {
    name: "CEIT-301",
    capacity: 30,
    equipment: ["TV", "Whiteboard", "Air Conditioning", "Computer Lab (30 PCs)"],
    building: "CEIT Building",
    floor: 3,
    isAvailable: true
  },
  {
    name: "CEIT-302",
    capacity: 30,
    equipment: ["Projector", "Whiteboard", "Air Conditioning", "Computer Lab (30 PCs)"],
    building: "CEIT Building",
    floor: 3,
    isAvailable: true
  },
  {
    name: "CEIT-Lab A",
    capacity: 25,
    equipment: ["Projector", "Whiteboard", "Air Conditioning", "Computer Lab (25 PCs)", "Electronics Equipment"],
    building: "CEIT Building",
    floor: 1,
    isAvailable: true
  },
  {
    name: "CEIT-Lab B",
    capacity: 25,
    equipment: ["TV", "Whiteboard", "Air Conditioning", "Computer Lab (25 PCs)", "Networking Equipment"],
    building: "CEIT Building",
    floor: 2,
    isAvailable: true
  },
  {
    name: "CEIT-Conference Room",
    capacity: 20,
    equipment: ["Projector", "Whiteboard", "Air Conditioning", "Conference Table", "Video Conferencing System"],
    building: "CEIT Building",
    floor: 4,
    isAvailable: true
  },
  {
    name: "CEIT-Auditorium",
    capacity: 150,
    equipment: ["Projector", "Sound System", "Air Conditioning", "Stage", "Wireless Microphones"],
    building: "CEIT Building",
    floor: 1,
    isAvailable: true
  }
];

async function addClassrooms() {
  try {
    console.log('🏫 Adding example classrooms to Firestore...\n');
    
    const classroomsCollection = collection(db, 'classrooms');
    let successCount = 0;
    
    for (const classroom of exampleClassrooms) {
      try {
        const docRef = await addDoc(classroomsCollection, {
          ...classroom,
          createdAt: serverTimestamp()
        });
        console.log(`✅ Added: ${classroom.name} (ID: ${docRef.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to add ${classroom.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully added ${successCount} out of ${exampleClassrooms.length} classrooms!`);
    console.log('\nClassroom Summary:');
    console.log(`   Total Classrooms: ${exampleClassrooms.length}`);
    console.log(`   Total Capacity: ${exampleClassrooms.reduce((sum, c) => sum + c.capacity, 0)} students`);
    console.log(`   Computer Labs: ${exampleClassrooms.filter(c => c.equipment.some(e => e.includes('Computer Lab'))).length}`);
    console.log(`   Conference/Special: ${exampleClassrooms.filter(c => c.name.includes('Conference') || c.name.includes('Auditorium')).length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addClassrooms();
