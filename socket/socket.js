import { v4 as uuidv4 } from "uuid";
import { isPlayerInRoom, handleGameCompletion } from "../index.js";
import { ProfileVisit } from "../schemas/schemas.js";

export function initializeSocket(io, activeUsers, rooms) {
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
        socket.emit("alreadyInRoom", {
          message: "Player joined another room.",
        });
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
      }
    });
  });
}
