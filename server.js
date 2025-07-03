const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const connectDB = require('./connect');

const app = express();
const PORT = 4000;
const HOST = '192.168.18.24';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', async (req, res) => {
  console.log('POST /login received'); // <-- Confirm it's working

  const { username, password } = req.body;
  const db = await connectDB();

  const user = await db.collection('users').findOne({ username });

  if (!user) {
    console.log('❌ User not found');
    return res.send('<h2>User not found</h2><a href="/">Try again</a>');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (isMatch) {
    console.log('✅ Login successful for', username);
    res.sendFile(path.join(__dirname, 'lobby.html'));
  } else {
    console.log('❌ Wrong password');
    res.send('<h2>Wrong password</h2><a href="/">Try again</a>');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
