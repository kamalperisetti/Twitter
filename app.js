const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");
const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const passwordIsValid = (password) => {
  return password.length > 6;
};

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "kamalakar", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}
app.post("/register/", async (request, response) => {
  const { name, username, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    const createUserQuery = `INSERT INTO
        user ( name, username, password, gender )
        VALUES 
            ('${name}',
            '${username}',
            '${hashedPassword}',
            '${gender}');`;
    if (passwordIsValid(password)) {
      await database.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatch === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "kamalakar");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

/*
app.get("/user/tweets/feed/", async(request, response) => {

})
*/
app.get("/user/following/", authenticateToken, async (request, response) => {
  const getFollwerQuery = `
  SELECT name FROM user NATURAL JOIN follower WHERE follower.follower_user_id GROUP BY user_id;`;
  const userName = await database.all(getFollwerQuery);
  response.send(userName);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const userFollowersQuery = `
    SELECT name FROM user NATURAL JOIN follower WHERE follower.follower_user_id GROUP BY user_id;`;
  const followewrName = await database.all(userFollowersQuery);
  response.send(followewrName);
});

/*
app.get("/tweets/:tweetId/", async(request, response) => {



})
*/
module.exports = app;
