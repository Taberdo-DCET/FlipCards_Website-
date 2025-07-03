const bcrypt = require('bcrypt');
const connectDB = require('./connect');

async function createStudent() {
  const db = await connectDB();
  const username = 'Rph.w';
  const rawPassword = '123456';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const result = await db.collection('users').insertOne({
    username,
    password: hashedPassword,
    role: 'student'
  });

  console.log("✅ Account created:", result.insertedId);
}

createStudent();
