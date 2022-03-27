require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const axios = require('axios').default
const { userJoin, getCurrentUser, userLeave, getRoomUsers, users } = require('./utils/users');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: '*' }
});

const getTranslation = async (msg, destLang) => {
  try {
    const option = {
      method: 'GET',
      url: 'https://just-translated.p.rapidapi.com/',
      params: { lang: destLang, text: msg },
      headers: {
        'X-RapidAPI-Host': process.env.RAPID_API_HOST,
        'X-RapidAPI-Key': process.env.RAPID_API_KEY
      }
    };

    const result = await axios.request(option);
    const tranlatedMsg = result?.data.text[0];
    return tranlatedMsg;
  } catch (error) {
    return error;
  }
}

const { messages, saveMessages, formatMessage } = require('./utils/messages');

// Run when client connects
io.on('connection', socket => {
  socket.on('join', async (userModel) => {
    const { existing, newUser } = userJoin(socket.id, userModel.name, userModel.room, userModel.language);
    socket.join(newUser.room);

    // Welcome current user

    if (!existing) {
      const translatedMsg = await getTranslation('Welcome', newUser.language)
      io.to(newUser.id).emit('message', formatMessage('Admin', translatedMsg));
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
      io.to(user.id).emit('message', formatMessage(currentUser.name, translatedMsg));
    })
  });

  socket.on('disconnect', () => {
    const currentUser = userLeave(socket.id);

    if (currentUser) {
      users.forEach(async user => {
        const translatedMsg = await getTranslation(`${currentUser.name} has left the chat`, user.language)
        io.to(user.id).emit('message', formatMessage('Admin', translatedMsg));
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
