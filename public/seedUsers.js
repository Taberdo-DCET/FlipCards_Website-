const bcrypt = require('bcrypt');
const connectDB = require('./connect');

async function createUser(username, rawPassword) {
  const db = await connectDB();
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const result = await db.collection('users').insertOne({ username, password: hashedPassword });
  console.log("✅ User created:", result.insertedId);
}

createUser('student01', '123456');
