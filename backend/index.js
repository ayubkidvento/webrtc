const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Secure this in production
  },
});

// Store connected users and their pairings
const users = {}; // Users: { socketId: { userId, username, connected } }
const pairs = {}; // Pairings: { socketId1: socketId2, socketId2: socketId1 }

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Set username and store user details
  socket.on("setUserName", (username) => {
    const userInfo = {
      userId: socket.id,
      username: username,
      connected: new Date().toISOString(),
    };
    users[socket.id] = userInfo;
    console.log(`User ${username} connected with details:`, userInfo);

    // Attempt to pair the new user
    const availableUserId = Object.keys(users).find(
      (id) => id !== socket.id && !pairs[id]
    );

    if (availableUserId) {
      // Pair the users
      pairs[socket.id] = availableUserId;
      pairs[availableUserId] = socket.id;

      // Notify both users
      io.to(socket.id).emit("paired", {
        partnerId: availableUserId,
        partnerUsername: users[availableUserId].username,
      });
      io.to(availableUserId).emit("paired", {
        partnerId: socket.id,
        partnerUsername: username,
      });

      console.log(
        `Paired ${username} (${socket.id}) with ${users[availableUserId].username} (${availableUserId})`
      );
    } else {
      io.to(socket.id).emit("waiting", "Waiting for a partner...");
    }
    // Update user list for everyone
    io.emit("userList", Object.values(users)); // Send user objects
  });

  // Handle messages
  socket.on("message", (data) => {
    const partnerId = pairs[socket.id];
    const messageWithSender = {
      text: data,
      senderId: socket.id,
      sender: users[socket.id].username,
      datetime: new Date().toISOString(),
    };
    io.to(socket.id).emit("message", messageWithSender);
    if (partnerId) {
      io.to(partnerId).emit("message", messageWithSender);
    } else {
      socket.emit("error", "You are not paired with anyone.");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const userInfo = users[socket.id];
    console.log(
      `User ${userInfo?.username || "unknown"} disconnected:`,
      socket.id
    );

    // Inform the partner (if any) about the disconnection
    const partnerId = pairs[socket.id];
    if (partnerId) {
      io.to(partnerId).emit("partnerDisconnected", {
        partnerId: socket.id,
        partnerUsername: userInfo?.username,
      });
      delete pairs[partnerId]; // Free the partner
    }

    // Clean up
    delete users[socket.id];
    delete pairs[socket.id];

    // Update user list for everyone
    io.emit("userList", Object.values(users)); // Send user objects
  });

  // for video calling
  // socket.on("offer", (offer) => {
  //   const partnerId = pairs[socket.id];
  //   if (partnerId) {
  //     io.to(partnerId).emit("offer", offer);
  //   }
  // });

  // socket.on("answer", (answer) => {
  //   const partnerId = pairs[socket.id];
  //   if (partnerId) {
  //     io.to(partnerId).emit("answer", answer);
  //   }
  // });

  // socket.on("candidate", (candidate) => {
  //   const partnerId = pairs[socket.id];
  //   if (partnerId) {
  //     io.to(partnerId).emit("candidate", candidate);
  //   }
  // });
  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer); // Simplified broadcast - refine with rooms or peer IDs later
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer); // Simplified broadcast
  });

  socket.on("candidate", (candidate) => {
    socket.broadcast.emit("candidate", candidate); // Simplified broadcast
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
