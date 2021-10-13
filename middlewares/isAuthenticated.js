const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace("Bearer ", "");
      const user = await User.findOne({ token: token }).select(
        "_id email username favoriteGames reviews token"
      );
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(401).json({ message: "Unauthorized, didnt find user" });
      }
    } else {
      res.status(401).json({ message: "Unauthorized, bad authorisation" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = isAuthenticated;
