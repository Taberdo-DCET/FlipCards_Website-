// connect.js
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // local MongoDB URI
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    return client.db('myTestDB'); // the database you created earlier
  } catch (err) {
    console.error("❌ Connection error:", err);
  }
}

module.exports = connectDB;
