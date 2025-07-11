// createUser.js
const connectDB = require('./connect');

async function createUser(name, email) {
  const db = await connectDB();
  const result = await db.collection('users').insertOne({ name, email });
  console.log("User created with ID:", result.insertedId);
}

createUser("TestUser", "test@example.com");
