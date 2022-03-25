const moment = require('moment');

const messages = [];

function saveMessages(user, message) {
  messages.push({
    id: user.id,
    name: user.name,
    language: user.language,
    message,
  });
}

function formatMessage(name, text) {
  return {
    name,
    text,
    time: moment().format('h:mm a')
  };
}

module.exports = {
  messages,
  saveMessages,
  formatMessage
};
