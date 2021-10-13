const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");

const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    // console.log("route");
    const { email, username, password, confirmPassword } = req.fields;
    const emailExist = await User.findOne({ email: email });
    if (!emailExist) {
      if (password === confirmPassword) {
        const salt = uid2(16);
        const hash = SHA256(password + salt).toString(encBase64);
        const token = uid2(64);

        // console.log(req.files);
        if (
          email &&
          username &&
          password &&
          confirmPassword &&
          req.files.avatar.path
        ) {
          const newUser = new User({
            email,
            username,
            salt,
            hash,
            token,
          });

          const result = await cloudinary.uploader.upload(
            req.files.avatar.path,
            {
              folder: `gamepad/users/${email}`,
            }
          );

          newUser.avatar = result;

          await newUser.save();
          res.status(200).json({
            id: newUser._id,
            username,
            token,
            result,
          });
        } else {
          res
            .status(400)
            .json({ error: { message: "All fields are required." } });
        }
      } else {
        res.status(401).json({
          error: {
            message: "Passwords should match.",
          },
        });
      }
    } else {
      res.status(409).json({
        error: { message: "This email is already used." },
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  const { email, password } = req.fields;
  try {
    if (email && password) {
      const user = await User.findOne({ email: email });
      if (user) {
        const newHash = SHA256(password + user.salt).toString(encBase64);
        if (newHash === user.hash) {
          res.status(200).json({
            id: user._id,
            username: user.username,
            token: user.token,
          });
          console.log("ok");
        } else {
          res
            .status(401)
            .json({ error: { message: "Wrong email or password." } });
        }
      } else {
        res
          .status(401)
          .json({ error: { message: "Wrong email or password." } });
      }
    } else {
      res.status(400).json({ error: { message: "All fields are required." } });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/users/:id", async (req, res) => {
  if (req.params.id) {
    try {
      const user = await User.findById(req.params.id);

      if (user) {
        res.status(200).json({
          id: user._id,
          username: user.username,
        });
      } else {
        res.status(200).json({ message: "User not found." });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing id." });
  }
});

/* Update user (except pictures & password) */
router.put("/user/update", isAuthenticated, async (req, res) => {
  try {
    const { email, username } = req.fields;
    if (email || username) {
      if (email) {
        const email = await User.findOne({ email: email });

        if (email) {
          return res
            .status(400)
            .json({ message: "This email is already used." });
        }
      }

      if (username) {
        const username = await User.findOne({
          "account.username": username,
        });

        if (username) {
          return res
            .status(400)
            .json({ message: "This username is already used." });
        }
      }

      const user = req.user;

      if (email) {
        user.email = email;
      }
      if (username) {
        user.username = username;
      }

      await user.save();

      res.status(200).json({
        id: user._id,
        email: user.email,
        username: user.username,
      });
    } else {
      res.status(400).json({ error: "Missing parameters." });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Update user password */
router.put("/user/update_password", isAuthenticated, async (req, res) => {
  const { previousPassword, newPassword } = req.fields;
  if (previousPassword && newPassword) {
    try {
      const user = req.user;

      if (
        SHA256(previousPassword + user.salt).toString(encBase64) === user.hash
      ) {
        if (
          SHA256(previousPassword + user.salt).toString(encBase64) !==
          SHA256(newPassword + user.salt).toString(encBase64)
        ) {
          const salt = uid2(64);
          const hash = SHA256(newPassword + salt).toString(encBase64);
          const token = uid2(64);

          user.salt = salt;
          user.hash = hash;
          user.token = token;
          await user.save();

          const userEmail = user.email;

          const mg = mailgun({
            apiKey: MAILGUN_API_KEY,
            domain: MAILGUN_DOMAIN,
          });

          const data = {
            from: "Gamepad API <postmaster@" + MAILGUN_DOMAIN + ">",
            to: userEmail,
            subject: "Gamepad - password",
            text: `Your password have been successfully modified.`,
          };

          mg.messages().send(data, function (error, body) {
            if (error) {
              res.status(400).json({ error: "An error occurred." });
            } else {
              res.status(200).json({
                id: user._id,
                email: user.email,
                username: user.username,
                token: user.token,
              });
            }
          });
        } else {
          res.status(400).json({
            error: "Previous password and new password must be different.",
          });
        }
      } else {
        res.status(400).json({ error: "Wrong previous password." });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(400).json({ message: "Missing parameters." });
  }
});

/* Send link to change password */
router.put("/user/recover_password", async (req, res) => {
  if (req.fields.email) {
    try {
      const user = await User.findOne({ email: req.fields.email });

      if (user) {
        const update_password_token = uid2(64);
        user.updatePasswordToken = update_password_token;

        const update_password_expiredAt = Date.now();
        user.updatePasswordExpiredAt = update_password_expiredAt;

        await user.save();

        const userEmail = user.email;
        const mg = mailgun({
          apiKey: MAILGUN_API_KEY,
          domain: MAILGUN_DOMAIN,
        });

        const data = {
          from: "Gamepad <postmaster@" + MAILGUN_DOMAIN + ">",
          to: userEmail,
          subject: "Change your password on Airbnb.",
          text: `Please, click on the following link to change your password : https://gamepad/change_password?token=${update_password_token}. You have 15 minutes to change your password.`,
        };

        mg.messages().send(data, function (error, body) {
          if (error) {
            res.status(400).json({ error: "An error occurred." });
          } else {
            res
              .status(200)
              .json({ message: "A link has been sent to the user." });
          }
        });
      } else {
        return res.status(400).json({ message: "User not found." });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(400).json({ message: "Missing email." });
  }
});

/* User reset password */
router.put("/user/reset_password", async (req, res) => {
  if (req.fields.passwordToken && req.fields.password) {
    try {
      const user = await User.findOne({
        updatePasswordToken: req.fields.passwordToken,
      });

      if (user) {
        const date = Date.now();

        console.log(date);

        const difference = date - user.updatePasswordExpiredAt;
        console.log(difference);

        let isExpired;
        if (difference < 900000) {
          isExpired = false;
        } else {
          isExpired = true;
        }

        if (!isExpired) {
          const salt = uid2(64);
          const hash = SHA256(req.fields.password + salt).toString(encBase64);
          const token = uid2(64);

          user.salt = salt;
          user.hash = hash;
          user.token = token;
          user.updatePasswordToken = null;
          user.updatePasswordExpiredAt = null;

          await user.save();
          res.status(200).json({
            id: user._id,
            email: user.email,
            token: user.token,
          });
        } else {
          return res.status(400).json({ message: "Time expired." });
        }
      } else {
        res.status(400).json({ error: "User not found." });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(400).json({ message: "Missing parameters." });
  }
});

/* User upload picture */
router.put("/user/upload_picture/:id", isAuthenticated, async (req, res) => {
  if (req.files.avatar) {
    try {
      const user = await User.findById(req.params.id);

      if (user) {
        if (String(user._id) === String(req.user._id)) {
          if (!user.avatar) {
            const newObj = {};

            await cloudinary.uploader.upload(
              req.files.avatar.path,

              {
                folder: `gamepad/users/${email}`,
              },

              async function (error, result) {
                newObj.url = result.secure_url;
                newObj.picture_id = result.public_id;

                await User.findByIdAndUpdate(req.params.id, {
                  avatar: newObj,
                });
              }
            );
          } else {
            const newObj = {};

            await cloudinary.uploader.upload(
              req.files.avatar.path,

              { public_id: user.avatar.picture_id },

              async function (error, result) {
                newObj.url = result.secure_url;
                newObj.picture_id = result.public_id;

                await User.findByIdAndUpdate(req.params.id, {
                  avatar: newObj,
                });
              }
            );
          }

          const userUpdated = await User.findById(req.params.id);

          res.status(200).json({
            id: userUpdated._id,
            email: userUpdated.email,
            username: userUpdated.username,
          });
        } else {
          res.status(401).json({ error: "Unauthorized." });
        }
      } else {
        res.status(400).json({ error: "User not found." });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing picture." });
  }
});

/* User delete picture */
router.put("/user/delete_picture/:id", isAuthenticated, async (req, res) => {
  if (req.params.id) {
    try {
      const user = await User.findById(req.params.id);

      if (user) {
        if (String(user._id) === String(req.user._id)) {
          if (user.avatar) {
            await cloudinary.uploader.destroy(user.avatar.picture_id);

            await User.findByIdAndUpdate(req.params.id, {
              avatar: null,
            });

            const userUpdated = await User.findById(req.params.id);
            res.status(200).json({
              id: userUpdated._id,
              email: userUpdated.email,
              username: userUpdated.username,
            });
          } else {
            res.status(400).json({ message: "No photo found." });
          }
        } else {
          res.status(401).json({ error: "Unauthorized." });
        }
      } else {
        res.status(400).json({ error: "User not found." });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    // If the user id has not been sent
    res.status(400).json({ error: "Missing user id." });
  }
});

/* Delete user */
router.delete("/user/delete", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;

    await User.findByIdAndRemove(user._id);

    res.status(200).json({ message: "User deleted." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
