import mongoose from "mongoose";

// Users Schema
const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  // Additional fields can be added as needed, such as email, date of registration, etc.
});

export const User = mongoose.model("users", userSchema);

// Profile Schema
const profileSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  about: { type: String, default: "" },
  profileImage: { type: String, default: "" },
  banner: { type: String, default: "" },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesDrawn: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
});

export const Profile = mongoose.model("profiles", profileSchema);

// Rooms Schema
const roomsSchema = mongoose.Schema({
  roomId: { type: String, unique: true },
  challenger: { type: String, unique: false },
  challengedTo: { type: String, unique: false },
  winner: { type: String, default: "" },
  isWinner: { type: Boolean },
  board: { type: Array },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export const Room = mongoose.model("rooms", roomsSchema);

const profileVisitSchema = new mongoose.Schema({
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true,
  },
  visitedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export const ProfileVisit = mongoose.model("ProfileVisit", profileVisitSchema);
