import express from "express";
import { User, Profile, ProfileVisit } from "../schemas/schemas.js";
import mongoose from "mongoose";

const router = express.Router();

router.get("/auth", function (req, res) {
  req.session.userData ? res.send(req.session.userData) : res.send(false);
});
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).json({ error: "Server error" });
    } else {
      res.clearCookie();
      res.json({ message: "Logout successful" });
    }
  });
});
router.post("/signup", async (req, res) => {
  const { fullName, username, password } = req.body;

  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    // If the username is unique, proceed with user creation
    const newUser = new User({
      fullName,
      username,
      password,
    });

    await newUser.save();
    const data = {
      isAuth: true,
      fullName,
    };
    // Store data in session so user directly logged in after signup
    // req.session.userData = data;
    // req.session.save();

    res.send(true);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({
      username: username,
      password: password,
    }).lean();
    if (user) {
      // Setting session data upon successful login

      const data = {
        isAuth: true,
        fullName: user.fullName,
        id: user._id,
      };
      req.session.userData = data;
      req.session.save();
      res.send(true);
    } else {
      res.send(false);
    }
  } catch (error) {
    console.error(error);
    res.status(409).json({ message: error.message });
  }
});

// After Login Routes

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  // Validate if userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid userId" });
  }

  try {
    const user = await User.findOne({ _id: userId }).lean();

    if (user) {
      const profile = await Profile.findOne({ user: userId }).lean();

      const userData = {
        fullName: user.fullName,
        username: user.username,
        userId: user._id.toString(),
        banner: profile ? profile.banner : "",
        about: profile ? profile.about : "",
        profileImage: profile ? profile.profileImage : "",
        gamesPlayed: profile ? profile.gamesPlayed : 0,
        gamesWon: profile ? profile.gamesWon : 0,
        gamesDrawn: profile ? profile.gamesDrawn : 0,
        gamesLost: profile ? profile.gamesLost : 0,
        points: profile ? profile.points : 0,
      };

      res.json(userData);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/all-users", async (req, res) => {
  try {
    const allUsers = await User.find().lean();
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/profile-visitors", async (req, res) => {
  try {
    const userId = req.query.userId;
    const visitedUsers = await ProfileVisit.find({ visitedUserId: userId })
      .populate("visitorId", "fullName") // Specify the fields you want to populate
      .sort({ timestamp: -1 }) // Sort by timestamp in descending order
      .exec();
    res.json(visitedUsers);
  } catch (error) {
    console.error("Error fetching profile visitors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.put("/update-image", async (req, res) => {
  const { profileImage, userId } = req.body;

  try {
    await Profile.findOneAndUpdate(
      { user: userId },
      { profileImage: profileImage },
      { new: true, upsert: true }
    );
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(409).json({ message: error.message });
  }
});

export default router;
