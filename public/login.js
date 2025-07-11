const bcrypt = require('bcrypt');
const connectDB = require('./connect');

async function login(username, password) {
  const db = await connectDB();
  const user = await db.collection('users').findOne({ username });

  if (!user) {
    console.log("❌ Username not found");
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    console.log("✅ Login successful!");
    console.log("Welcome,", user.username);
    // You can redirect to dashboard, create session, etc.
  } else {
    console.log("❌ Incorrect password");
  }
}

// try logging in
login("student01", "123456");
