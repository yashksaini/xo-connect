import mongoose from "mongoose";

export const Connection = async (username, password) => {
  const mongoURL = `mongodb+srv://${username}:${password}@cluster0.xwisexr.mongodb.net/?retryWrites=true&w=majority`;
  try {
    await mongoose.connect(mongoURL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    console.log("Database connected successfully");
  } catch (error) {
    console.log("Error while connecting with the database", error);
  }
};
