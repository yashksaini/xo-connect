import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { Connection } from "./database/db.js";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Room, ProfileVisit, Profile } from "./schemas/schemas.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow requests from this origin
    methods: ["GET", "POST"],
  },
});

const PORT = 3000;

dotenv.config();

const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

const URL = `mongodb+srv://${username}:${password}@cluster0.xwisexr.mongodb.net/?retryWrites=true&w=majority`;
Connection(username, password);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: "asdfefna",
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({ mongoUrl: URL }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days in milliseconds
      httpOnly: true,
      secure: false, // For development; set to true in production (requires HTTPS)
    },
  })
);

// To initialize CORS
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "OPTIONS", "HEAD"],
    credentials: true,
  })
);

import Routes from "./routes/routes.js";
app.use("/", Routes);

// Created a list of new logged in users
const activeUsers = new Set();
const rooms = new Map();

function isPlayerInRoom(playerUserId) {
  return Array.from(rooms.values()).some((room) =>
    room.users.some((user) => user.userId === playerUserId)
  );
}

io.on("connection", (socket) => {
  io.emit("activeUsers", () => {}, Array.from(activeUsers));

  socket.on("login", async (userData) => {
    const user = {
      userId: userData.id,
      fullName: userData.fullName,
      socketId: socket.id,
    };
    const existingUser = Array.from(activeUsers).find(
      (user) => user.userId === userData.id
    );
    if (!existingUser) {
      activeUsers.add(user);
    }

    activeUsers.add(user);

    io.emit("activeUsers", Array.from(activeUsers));
  });

  socket.on("logout", async (socketId) => {
    const userToRemove = Array.from(activeUsers).find(
      (user) => user.socketId === socketId
    );
    if (userToRemove) {
      activeUsers.delete(userToRemove);
    }
    io.emit("activeUsers", Array.from(activeUsers));
  });

  socket.on("disconnect", () => {
    // Find the user object in activeUsers and remove it
    const disconnectedUserId = socket.id;
    const userToRemove = Array.from(activeUsers).find(
      (user) => user.socketId === disconnectedUserId
    );
    if (userToRemove) {
      activeUsers.delete(userToRemove);
    }

    io.emit("activeUsers", Array.from(activeUsers));
  });

  // Handle profile visit event
  socket.on(
    "profileVisit",
    async ({ visitedUserId, visitorName, visitorId }) => {
      // Assuming you have a user socketId saved in activeUsers
      try {
        const visitedUser = Array.from(activeUsers).find(
          (user) => user.userId === visitedUserId
        );
        // Add the profile visit data to the database
        await ProfileVisit.findOneAndUpdate(
          { visitorId, visitedUserId },
          { timestamp: new Date() },
          { upsert: true, new: true } // upsert: true performs an update or insert, new: true returns the updated document
        );

        if (visitedUser) {
          io.to(visitedUser.socketId).emit("profileVisit", {
            visitorName,
            visitedUserId,
          });
        }
      } catch (error) {
        console.error("Error handling profile visit:", error);
      }
    }
  );

  // Challenge Logic
  socket.on("sendChallenge", ({ opponentId, challenger }) => {
    if (isPlayerInRoom(opponentId)) {
      socket.emit("alreadyInRoom", { message: "Player is in another room" });
      return;
    }
    const targetSocket = Array.from(activeUsers).find(
      (user) => user.userId === opponentId
    )?.socketId;

    if (targetSocket) {
      const roomId = uuidv4();

      // Join the sender to the room
      socket.join(roomId);

      io.to(targetSocket).emit("receiveChallenge", { challenger, roomId });

      // Store the room information
      socket.roomsList = socket.roomsList || new Set();
      socket.roomsList.add(roomId);
    }
  });

  socket.on("acceptChallenge", ({ roomId, challenger, challengedTo }) => {
    // Join the receiver to the room
    if (isPlayerInRoom(challenger.userId)) {
      socket.emit("alreadyInRoom", { message: "Player joined another room." });
      return;
    }
    socket.join(roomId);
    const board = Array(9).fill(null);
    const users = [
      {
        userId: challengedTo.userId,
        fullName: challengedTo.fullName,
      },
      {
        userId: challenger.userId,
        fullName: challenger.fullName,
      },
    ];

    rooms.set(roomId, { users: users, board, isXNext: true });
    io.to(roomId).emit("challengeAccepted", {
      roomId,
      challenger,
      challengedTo,
    });
  });

  socket.on("declineChallenge", ({ challenger, challengedTo }) => {
    const targetSocket = Array.from(activeUsers).find(
      (user) => user.userId === challenger.userId
    )?.socketId;
    io.to(targetSocket).emit("challengeDeclined", {
      challenger,
      challengedTo,
    });
  });
  // Handle player move
  socket.on("updateBoard", ({ board, roomId, isXNext }) => {
    // Broadcast the updated board to all other players in the room
    const roomData = rooms.get(roomId);

    if (roomData) {
      roomData.board = board;
      roomData.isXNext = isXNext;
      rooms.set(roomId, roomData);

      // Get the user IDs in the room
      const userIdsInRoom = roomData.users.map((user) => user.userId);

      // Emit the updated board to all other players in the room using their userId
      userIdsInRoom.forEach((userId) => {
        const userSocket = Array.from(activeUsers).find(
          (user) => user.userId === userId
        )?.socketId;
        if (userSocket && userSocket !== socket.id) {
          io.to(userSocket).emit("updateBoard", { board, isXNext });
        }
      });
    }
  });

  socket.on("leaveRoom", (data) => {
    const { roomId, userId, fullName } = data;
    const roomData = rooms.get(roomId);
    if (roomData) {
      // Get the user IDs in the room
      const userIdsInRoom = roomData.users.map((user) => user.userId);

      if (rooms.has(roomId)) {
        rooms.delete(roomId);
      }
      let winnerId = roomData.users.filter((user) => user.userId != userId)[0]
        .userId;
      // Emit the updated board to all other players in the room using their userId
      userIdsInRoom.forEach((userId) => {
        const userSocket = Array.from(activeUsers).find(
          (user) => user.userId === userId
        )?.socketId;
        if (userSocket && userSocket !== socket.id) {
          io.to(userSocket).emit("playerLeft", { fullName: fullName });
        }
      });
      handleGameCompletion(
        roomId,
        winnerId,
        true,
        roomData.board,
        roomData.users[1].userId,
        roomData.users[0].userId
      );
      console.log("ROOM LEAVED", roomId);
    }
  });
});

app.get("/room-board/:roomId", (req, res) => {
  const { roomId } = req.params;
  const roomData = rooms.get(roomId);

  if (roomData) {
    res.json(roomData);
  } else {
    res.status(404).json({ message: "Room not found" });
  }
});

app.post("/game-completed", async (req, res) => {
  const { roomId, winnerId, isWinner, board, challenger, challengedTo } =
    req.body;
  try {
    handleGameCompletion(
      roomId,
      winnerId,
      isWinner,
      board,
      challenger,
      challengedTo
    );
    res.send(true);
  } catch (error) {
    console.log(error);
  }
});

async function handleProfileUpdate(user, incData) {
  await Profile.findOneAndUpdate(
    { user: user },
    {
      $inc: incData,
    },
    { upsert: true, new: true }
  );
  console.log("Data updated");
}
async function handleUserStatsUpdates(
  winnerId,
  challenger,
  challengedTo,
  isWinner
) {
  //If the game is drawn
  if (!isWinner) {
    const incData = {
      gamesPlayed: 1,
      gamesDrawn: 1,
      points: 1,
    };
    handleProfileUpdate(challenger, incData);
    handleProfileUpdate(challengedTo, incData);
  } //If the game won by one user
  else {
    let loserId = challengedTo;
    if (challenger !== winnerId) {
      loserId = challenger;
    }
    const wincData = {
      gamesPlayed: 1,
      gamesWon: 1,
      points: 2,
    };
    const lincData = {
      gamesPlayed: 1,
      gamesLost: 1,
    };
    handleProfileUpdate(winnerId, wincData);
    handleProfileUpdate(loserId, lincData);
  }
}
async function handleGameCompletion(
  roomId,
  winnerId,
  isWinner,
  board,
  challenger,
  challengedTo
) {
  try {
    const newRoom = new Room({
      roomId,
      winner: winnerId,
      isWinner,
      board,
      challenger,
      challengedTo,
      timestamp: new Date(),
    });
    await newRoom.save();
    handleUserStatsUpdates(winnerId, challenger, challengedTo, isWinner);

    if (rooms.has(roomId)) {
      rooms.delete(roomId);
    }
  } catch (error) {
    console.error(error);
  }
}

app.get("/active-users", (req, res) => {
  res.json(Array.from(activeUsers));
});
app.get("/check-server-status", (req, res) => {
  const isServerActive = true;

  res.json({ active: isServerActive });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
