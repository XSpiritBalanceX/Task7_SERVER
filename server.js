require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");

const PORT = process.env.PORT || 5000;

app.use(cors());
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = {};

app.get("/", (req, res) => {
  res.send("Server running...");
});

io.on("connection", (socket) => {
  let roomId = socket.handshake.query.roomId;
  let playerName = socket.handshake.query.playerName;
  let socketId = socket.id;

  let validation = validateRoom(roomId, playerName, socketId);
  
  if (validation) {
    console.log(
      `${playerName} with socket id ${socketId} connected to room : ${roomId}`
    );
    socket.join(roomId);
    io.to(roomId).emit("new-user", rooms[roomId]);
  } else {
    console.log("Room is full");
  }

  socket.on("disconnect", () => {
    console.log(`user disconnected --> ${socket.id}`);
    let [roomDisconneted,playerDisconnected] = deletePlayer(socket.id);
    if(roomDisconneted !== null) {
      io.to(roomDisconneted).emit("remove-user", playerDisconnected);
    }
  });

  socket.on("board", (data) => {
    socket.to(data.roomName).emit("board", data.board);
    console.log("BOARD...");
  });

  socket.on('set-role', (data) => {
    console.log("ROLE")
    console.log(data)
    if(rooms[data.roomName].player1.socketId === data.socketId) {
      rooms[data.roomName].player1.role = data.role
    }
    if(rooms[data.roomName].player2.socketId === data.socketId) {
      rooms[data.roomName].player2.role = data.role
    }
  });

  socket.on("chat", (data) => {
    socket.to(data.roomName).emit("chat", data);
  });

});


app.get("/getPlayerRoles/:roomName", (req, res) => {
  res.json(rooms[req.params.roomName]);
});

app.get("/setPlayerRoles/:roomName", (req, res) => {
  rooms[req.params.roomName].player1.role = null
  rooms[req.params.roomName].player2.role = null
  res.json({message:"Success"});
});

app.get("/rooms", (req, res) => {
  res.json(rooms);
});

server.listen(PORT, () => {
  console.log(`Server listening on port : ${PORT}`);
});

function validateRoom(roomId, playerName, socketId) {
  if (rooms[roomId] !== undefined) {
    console.log("Room exists");

    if (rooms[roomId].player1.playerName === null) {
      console.log("Adding to player1 slot");
      rooms[roomId] = {
        ...rooms[roomId],
        player1: { playerName: playerName, socketId: socketId, role: null },
      };
      return true;
    } else if (rooms[roomId].player2.playerName === null) {
      console.log("Adding to player2 slot");
      rooms[roomId] = {
        ...rooms[roomId],
        player2: { playerName: playerName, socketId: socketId, role: null },
      };
      return true;
    } else {
      return false;
    }
  } else {
    rooms[roomId] = {
      player1: { playerName: playerName, socketId: socketId, role: null },
      player2: { playerName: null, socketId: null, role: null },
    };
    console.log("Room created with player 1");
    return true;
  }
}

function deletePlayer(socketId) {
  let tempRoom = null
  let tempName = null
  for (let room in rooms) {
    if (rooms[room].player1.socketId === socketId) {
      tempName = rooms[room].player1.playerName
      rooms[room] = {
        player1: {
          playerName: null,
          socketId: null,
          role: null,
        },
        player2: {
          playerName: rooms[room].player2.playerName,
          socketId: rooms[room].player2.socketId,
          role: rooms[room].player2.role,
        },
      };
      tempRoom = room
    }
    if (rooms[room].player2.socketId === socketId) {
      tempName = rooms[room].player2.playerName
      rooms[room] = {
        player1: {
          playerName: rooms[room].player1.playerName,
          socketId: rooms[room].player1.socketId,
          role: rooms[room].player1.role,
        },
        player2: {
          playerName: null,
          socketId: null,
          role: null,
        },
      };
      tempRoom = room
    }
    if (
      rooms[room].player1.socketId === null &&
      rooms[room].player2.socketId === null
    ) {
      delete rooms[room];
      return [null,null]
    }
  }
  return [tempRoom, tempName]
}
