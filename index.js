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
import { Room, Profile } from "./schemas/schemas.js";
import { initializeSocket } from "./socket/socket.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Created a list of new logged in users
const activeUsers = new Set();
const rooms = new Map();
const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow requests from this origin
    methods: ["GET", "POST"],
  },
});

initializeSocket(io, activeUsers, rooms);

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
      secure: false,
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

export function isPlayerInRoom(playerUserId) {
  return Array.from(rooms.values()).some((room) =>
    room.users.some((user) => user.userId === playerUserId)
  );
}

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
export async function handleGameCompletion(
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

app.use(express.static(join(__dirname, "public")));

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
