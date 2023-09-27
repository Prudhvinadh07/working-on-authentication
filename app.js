const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const priorUserQuery = ` SELECT * FROM user WHERE username = '${username}';`;
  const priorUser = await db.get(priorUserQuery);
  if (priorUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
            INSERT INTO user (username, name, password, gender, location)
            VALUES ('${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
            );
            `;
      const newUser = await db.run(createUserQuery);
      const newUserId = newUser.lastID;
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const priorUserQuery = ` SELECT * FROM user WHERE username = '${username}';`;
  const priorUser = await db.get(priorUserQuery);

  if (priorUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      priorUser.password
    );
    if (isPasswordMatched !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      response.status(200);
      response.send("Login success!");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const priorUserQuery = ` SELECT * FROM user WHERE username = '${username}';`;
  const priorUser = await db.get(priorUserQuery);
  if (priorUser === undefined) {
    response.status(400);
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      priorUser.password
    );
    if (isPasswordMatched !== true) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const changePasswordQuery = `
            UPDATE user
            SET password = '${hashedPassword}'
            WHERE username = '${username}';
            `;
        await db.run(changePasswordQuery);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
