// Seed script for Firebase Emulator
// This script populates the emulator with sample data for development

const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
admin.initializeApp({
  projectId: 'demo-project',
});

const db = admin.firestore();

async function seedData() {
  console.log('🌱 Seeding Firebase Emulator with sample data...');

  try {
    // Sample users
    const users = [
      {
        id: 'admin1',
        email: 'admin@plv.edu.ph',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        department: 'CEIT',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'faculty1',
        email: 'faculty1@plv.edu.ph',
        role: 'faculty',
        firstName: 'John',
        lastName: 'Doe',
        department: 'Computer Engineering',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'faculty2',
        email: 'faculty2@plv.edu.ph',
        role: 'faculty',
        firstName: 'Jane',
        lastName: 'Smith',
        department: 'Information Technology',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    ];

    // Sample classrooms
    const classrooms = [
      {
        id: 'room301',
        name: 'CEIT Room 301',
        capacity: 40,
        equipment: ['Projector', 'Whiteboard', 'Computer', 'Air Conditioning'],
        building: 'CEIT Building',
        floor: 3,
        isActive: true,
      },
      {
        id: 'room302',
        name: 'CEIT Room 302',
        capacity: 35,
        equipment: ['Projector', 'Whiteboard', 'Air Conditioning'],
        building: 'CEIT Building',
        floor: 3,
        isActive: true,
      },
      {
        id: 'lab401',
        name: 'Computer Lab 401',
        capacity: 30,
        equipment: ['30 Computers', 'Projector', 'Whiteboard', 'Air Conditioning'],
        building: 'CEIT Building',
        floor: 4,
        isActive: true,
      }
    ];

    // Sample bookings
    const bookings = [
      {
        id: 'booking1',
        roomId: 'room301',
        facultyId: 'faculty1',
        facultyName: 'John Doe',
        subject: 'Computer Programming',
        startTime: new Date('2025-10-06T08:00:00'),
        endTime: new Date('2025-10-06T10:00:00'),
        status: 'approved',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'booking2',
        roomId: 'lab401',
        facultyId: 'faculty2',
        facultyName: 'Jane Smith',
        subject: 'Database Systems',
        startTime: new Date('2025-10-06T13:00:00'),
        endTime: new Date('2025-10-06T15:00:00'),
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    ];

    // Write users to Firestore
    console.log('Adding sample users...');
    for (const user of users) {
      await db.collection('users').doc(user.id).set(user);
    }

    // Write classrooms to Firestore
    console.log('Adding sample classrooms...');
    for (const room of classrooms) {
      await db.collection('classrooms').doc(room.id).set(room);
    }

    // Write bookings to Firestore
    console.log('Adding sample bookings...');
    for (const booking of bookings) {
      await db.collection('bookings').doc(booking.id).set(booking);
    }

    console.log('✅ Sample data seeded successfully!');
    console.log('\n📊 Seeded data summary:');
    console.log(`   • ${users.length} users`);
    console.log(`   • ${classrooms.length} classrooms`);
    console.log(`   • ${bookings.length} bookings`);
    console.log('\n🔑 Test accounts:');
    console.log('   Admin: admin@plv.edu.ph');
    console.log('   Faculty: faculty1@plv.edu.ph, faculty2@plv.edu.ph');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedData()
  .then(() => {
    console.log('\n🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });