const http = require('http');

let FSocketServer = require('./../index.js');
let socket = new FSocketServer();

const server = http.createServer();
server.listen(9898);
socket.connect(server);

socket.on("connect", (user) => {
    console.log(user);
});

socket.on("disconnect", (user) => {
    console.log(user);
});

let subscribeId = socket.on("new-candle", (user, value, callback) => {
    console.log(value);
    callback({ newCandle: true });
});

// setInterval(() => {
//     socket.emit("candle", { test: true });
// }, 1000);