const bcrypt = require("bcrypt");

// Number of salt rounds (higher value = more secure but slower)
const saltRounds = 10;

// Replace this with the password you want to hash
const plainPassword = "ashley123";

// Hash the password
bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
  if (err) {
    console.error("Error hashing password:", err);
    return;
  }
  console.log("Hashed password:", hash);
});
