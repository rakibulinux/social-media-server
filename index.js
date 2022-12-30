const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
// Mongo DB Connections
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Middleware Connections
app.use(cors());
app.use(express.json());

//Verify JWT function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).send("Not authorization");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: "Forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}
// Routes
app.get("/", (req, res) => {
  res.send(`Social Media Server Running on port ${process.env.PORT}`);
});
async function run() {
  try {
    const usersCollection = client.db("socialMedia").collection("users");
    const postsCollection = client.db("socialMedia").collection("posts");
    const commentsCollection = client.db("socialMedia").collection("comments");

    // Verfy Users function
    const verifyUsers = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const email = await usersCollection.findOne(query);
      // if (email !== decodedEmail) {
      //   return res.status(403).send(`You dosen't have access to edit this`);
      // }
      next();
    };

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const updateUser = await usersCollection.updateOne(
        filter,
        updateDoc,
        option
      );
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ updateUser, token });
    });
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1d",
        });
        return res.send({ socialUserToken: token });
      }
      res.status(401).send({ message: "Unauthorized" });
    });
    app.post("/add-post", verifyJWT, verifyUsers, async (req, res) => {
      const addPost = req.body;
      const post = await postsCollection.insertOne(addPost);
      res.send(post);
    });
    app.get("/posts", async (req, res) => {
      const query = {};
      const sort = { publishedDate: -1 };
      const posts = await postsCollection.find(query).sort(sort).toArray();
      res.send(posts);
    });
    app.get("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const posts = await postsCollection.findOne(query);
      res.send(posts);
    });

    //Update a single post
    app.patch("/update-post/:id", async (req, res) => {
      const id = req.params.id;
      const reaction = req.body.newReaction;
      console.log(reaction);
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          reaction,
        },
      };

      const updatePost = await postsCollection.updateOne(
        filter,
        updateDoc,
        option
      );
      res.send(updatePost);
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });
    app.patch("/updateAbout/:id", async (req, res) => {
      const id = req.params.id;
      const name = req.body.name;
      const address = req.body.address;
      const university = req.body.university;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          name,
          address,
          university,
        },
      };

      const updatePost = await usersCollection.updateOne(
        filter,
        updateDoc,
        option
      );
      res.send(updatePost);
    });

    app.get("/comments", async (req, res) => {
      const query = {};
      const comment = await commentsCollection.find(query).toArray();
      res.send(comment);
    });
    app.post("/comments", async (req, res) => {
      const query = req.body;
      console.log(query);
      const comment = await commentsCollection.insertOne(query);
      res.send(comment);
    });
  } finally {
  }
}
run().catch((err) => {
  console.log(err);
});
// Connection
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("App running in port: " + PORT);
});
