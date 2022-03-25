const users = [];

// Join user to chat
function userJoin(id, name, room, language) {
  const user = { id, name, room, language };

  const existingUser = users.find((u) => u.room === room && u.name === name);

  if (existingUser) {
    return { existing: true, newUser: existingUser };
  }

  users.push(user);

  return { newUser: user };
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  users,
};