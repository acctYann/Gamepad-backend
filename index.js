const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const app = express();
app.use(formidable());
app.use(cors());
app.use(helmet());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const userRoutes = require("./routes/user");
app.use(userRoutes);
const favoriteRoutes = require("./routes/favorite");
app.use(favoriteRoutes);
const reviewRoutes = require("./routes/review");
app.use(reviewRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the Gamepad server ! 🎮" });
});

app.all("*", (req, res) => {
  res.status(400).json({ message: "Route not found. 🤔" });
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Server Started ! 🚀");
});
