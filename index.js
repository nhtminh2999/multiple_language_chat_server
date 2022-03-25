require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const AWS = require('aws-sdk');
const { userJoin, getCurrentUser, userLeave, getRoomUsers, users } = require('./utils/users');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: '*' }
});

const translate = new AWS.Translate({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-2',
});

const getTranslation = async (msg, destLang) => {
  const params = {
    Text: msg,
    SourceLanguageCode: 'auto',
    TargetLanguageCode: destLang
  };

  const tranlatedMsg = await translate.translateText(params, (err, data) => {
    return data;
  }).promise()

  return tranlatedMsg;
}

const { messages, saveMessages, formatMessage } = require('./utils/messages');

// Run when client connects
io.on('connection', socket => {
  socket.on('join', async (userModel) => {
    const { existing, newUser } = userJoin(socket.id, userModel.name, userModel.room, userModel.language);
    socket.join(newUser.room);

    // Welcome current user

    if (!existing) {
      const translatedMsg = await getTranslation('Welcome new user', newUser.language)
      io.to(newUser.id).emit('message', formatMessage('Admin', translatedMsg.TranslatedText));
    }

    // Send users and room info
    io.to(newUser.room).emit('roomUsers', {
      room: newUser.room,
      users: getRoomUsers(newUser.room)
    });
  });

  // Listen for sendMessage
  socket.on('sendMessage', message => {
    const currentUser = getCurrentUser(socket.id);
    saveMessages(currentUser, formatMessage(currentUser.name, message));
    users.forEach(async user => {
      const translatedMsg = await getTranslation(message, user.language)
      io.to(user.id).emit('message', formatMessage(currentUser.name, translatedMsg.TranslatedText));
    })
  });

  socket.on('disconnect', () => {
    const currentUser = userLeave(socket.id);

    if (currentUser) {
      users.forEach(async user => {
        const translatedMsg = await getTranslation(`${currentUser.name} has left the chat`, user.language)
        io.to(user.id).emit('message', formatMessage('Admin', translatedMsg.TranslatedText));
      })
      // Send users and room info
      io.to(currentUser.room).emit('roomUsers', {
        room: currentUser.room,
        users: getRoomUsers(currentUser.room)
      });
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
