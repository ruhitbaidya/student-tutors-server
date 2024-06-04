require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRATE);
const jwt = require("jsonwebtoken");
const app = express();

app.use(cors());
app.use(express.json());
//Student_tutorsDB
const uri = `mongodb+srv://${process.env.DATABASEUSER}:${process.env.DATABASEPASS}@datafind.xfgov3s.mongodb.net/?retryWrites=true&w=majority&appName=datafind`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // user collection
    const usercollection = client.db("Student_tutorsDB").collection("alluser");
    const sessioncollection = client
      .db("Student_tutorsDB")
      .collection("sessionCreate");
    const metarialcollection = client
      .db("Student_tutorsDB")
      .collection("metrialUpload");
    const notecollection = client
      .db("Student_tutorsDB")
      .collection("storeNote");
    const bookedSessioncollection = client
      .db("Student_tutorsDB")
      .collection("bookedSession");

    // create jwt
    app.post("/jwtCreate", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.TOKEN_SECRATE, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    // check role middleware
    const roleChecker = async (req, res, next) => {
      const { email } = req.decode;
      const query = { "user.email": email };
      const userFind = await usercollection.findOne(query);
      if (!userFind) {
        res.send({ message: "invalid user" });
      }
      if (userFind) {
        req.user = userFind.user.role;
        next();
      }
    };
    // user authorization check
    const verifytoken = (req, res, next) => {
      const token = JSON.parse(req.headers.authorization);
      const datas = token.split(" ");
      if (!datas[2]) {
        return res.send({ message: "UnAuthorize User" }).status(401);
      }

      // verify tokens
      jwt.verify(datas[2], process.env.TOKEN_SECRATE, (err, decode) => {
        if (err) {
          return res.send({ message: "tim UnAuthorize User" }).status(403);
        }
        if (datas[1] === decode.email) {
          req.decode = decode;
          next();
        } else {
          return res.send({ message: "UnAuthorize User" }).status(403);
        }
      });
    };

    //user admin student role check
    app.get("/checkRole/:email", verifytoken, async (req, res) => {
      const email = req.params.email;
      const finds = { "user.email": email };
      if (!email) {
        return res.send({ message: "min Unauthorize Use" }).status(401);
      }
      if (email) {
        const roles = await usercollection.findOne(finds);
        if (roles) {
          if (roles.user.role === "admin") {
            return res.send({ roles: "admin" });
          }
          if (roles.user.role === "tutor") {
            return res.send({ roles: "tutor" });
          }
          if (roles.user.role === "student") {
            return res.send({ roles: "student" });
          }
        }
      }
    });

    app.get("/getForeHome", async (req, res) => {
      const ids = { status: "approve" };
      const result = await sessioncollection.find(ids).limit(6).toArray();
      // const counts = await sessioncollection.find(ids).toArray().length;
      const counts = await sessioncollection.countDocuments(ids);
      res.send({ result, counts });
    });

    app.get("/getallsession", async (req, res) => {
      const query = { status: "approve" };
      const result = await sessioncollection.find(query).toArray();
      res.send(result);
    });

    app.get(
      "/sessionDetails/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        if (roles === "student" || roles === "admin" || roles === "tutor") {
          const result = await sessioncollection.findOne(ids);
          res.send(result);
        }
      }
    );

    // Test router
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });
    // -------------------- start admin rotuer -------------------

    // all user get
    app.get("/getAllUser", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      if (roles === "admin") {
        const result = await usercollection.find().toArray();
        return res.send(result);
      } else {
        return;
      }
    });

    // user role change
    app.patch(
      "/changeUserRole/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        const query = {
          $set: { "user.role": req.body.role },
        };
        if (roles === "admin") {
          const result = await usercollection.updateOne(ids, query);
          return res.send(result);
        } else {
          return;
        }
      }
    );

    //user search router
    app.get(
      "/userSearch/:searchKeys",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        console.log(req.params.searchKeys);
        const query = {
          $or: [
            { "user.email": { $regex: req.params.searchKeys, $options: "i" } },
            { "user.name": { $regex: req.params.searchKeys, $options: "i" } },
          ],
        };
        if (roles === "admin") {
          const result = await usercollection.find(query).toArray();
          return res.send(result);
        } else {
          return;
        }
      }
    );

    // all tutor name
    app.get(
      "/allTutorSession/:statusText",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        console.log();
        const query = { status: req.params.statusText };
        if (roles === "admin") {
          const result = await sessioncollection.find(query).toArray();
          res.send(result);
        }
      }
    );

    // change session status
    app.patch(
      "/sessionstatuschange/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const text = req.body.price;
        console.log(text);
        const ids = { _id: new ObjectId(req.params.id) };
        const query = {
          $set: { status: "approve", registerFree: text },
        };
        if (roles === "admin") {
          const result = await sessioncollection.updateOne(ids, query);
          res.send(result);
        }
      }
    );

    // handel react list status
    app.patch("/rejectlist/:id", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      const ids = { _id: new ObjectId(req.params.id) };
      const query = {
        $set: { status: "rejected" },
      };
      if (roles === "admin") {
        const result = await sessioncollection.updateOne(ids, query);
        res.send(result);
      }
    });
    // others router to panding list
    app.patch(
      "/pedndinglist/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        const query = {
          $set: { status: "pending" },
        };
        if (roles === "admin") {
          const result = await sessioncollection.updateOne(ids, query);
          res.send(result);
        }
      }
    );

    // delete session
    app.delete(
      "/deltesession/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        if (roles === "admin") {
          const result = await sessioncollection.deleteOne(ids);
          return res.send(result);
        } else {
          return;
        }
      }
    );

    // find session
    app.get("/getsession/:id", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      const ids = { _id: new ObjectId(req.params.id) };
      if (roles === "admin") {
        const result = await sessioncollection.findOne(ids);
        return res.send(result);
      } else {
        return;
      }
    });

    // update sesstion
    app.post(
      "/updateadminsession/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        const datas = req.body;
        const options = {
          $set: datas,
        };
        if (roles === "admin") {
          const result = await sessioncollection.updateOne(ids, options);
          return res.send(result);
        } else {
          return;
        }
      }
    );

    app.get("/getallmetrial", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      if (roles === "admin") {
        const result = await metarialcollection.find().toArray();
        return res.send(result);
      } else {
        return;
      }
    });
    // -------------------- end admin rotuer -------------------

    // -------------------- start tutor rotuer -------------------
    // create session router
    app.post("/createSession", verifytoken, roleChecker, async (req, res) => {
      // console.log(req.body)
      // console.log(req.user)
      const data = req.body;
      const role = req.user;
      if (role === "tutor") {
        const result = await sessioncollection.insertOne(data);
        res.send(result);
      } else {
        return res.send({ message: "You Can Not Create Any Session" });
      }
    });

    // get session tutor
    app.get(
      "/sessionfind/:email",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const findrule = req.user;
        const emails = req.params.email;
        const searchTutor = {
          tutorEmail: emails,
          $or: [{ status: "approve" }, { status: "rejected" }],
        };
        if (findrule === "tutor") {
          const result = await sessioncollection.find(searchTutor).toArray();
          console.log(result);
          res.send(result);
        } else {
          return res.send({ message: "Invalid User" });
        }
      }
    );

    // tutor metrial router add show
    app.get("/metrialuploadshow/:email", verifytoken, async (req, res) => {
      const emails = req.params.email;
      const query = { tutoremail: emails };
      if (emails) {
        const result = await metarialcollection.find(query).toArray();
        return res.send(result);
      } else {
        return;
      }
    });

    // only tutor delete metrial
    app.delete(
      "/deleteMetrial/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = req.params.id;
        const query = { _id: new ObjectId(ids) };
        console.log(roles, query);
        if (roles === "tutor" || roles === "admin") {
          const result = await metarialcollection.deleteOne(query);
          return res.send(result);
        } else {
          return;
        }
      }
    );

    // only tutor update metarial
    app.get("/getForUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const ids = { _id: new ObjectId(id) };
      const result = await metarialcollection.findOne(ids);
      res.send(result);
    });

    // update metirial
    app.patch(
      "/updateMertial/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const datas = req.body;
        const ids = { _id: new ObjectId(req.params.id) };
        const options = {
          $set: datas,
        };
        if (roles === "tutor") {
          const result = await metarialcollection.updateOne(ids, options);
          res.send(result);
        }
      }
    );
    //send again reject request
    app.patch(
      "/statusChange/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        const setData = { $set: { status: "pending" } };
        if (roles === "tutor") {
          const result = await sessioncollection.updateOne(ids, setData);
          res.send(result);
        }
      }
    );

    //only tutor approve session view this link
    app.get(
      "/TutorOnlyApprove/:email",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const emails = req.params.email;
        const roles = req.user;
        if (roles === "tutor") {
          const query = {
            $and: [{ tutorEmail: emails }, { status: "approve" }],
          };
          const result = await sessioncollection.find(query).toArray();
          res.send(result);
        }
      }
    );

    //upload Meterial
    app.post("/uploadMetrial", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      const datas = req.body;
      if (roles === "tutor") {
        const result = await metarialcollection.insertOne(datas);
        return res.send(result);
      } else {
        return res.send({ message: "unauthorize user" });
      }
    });

    // -------------------- end tutor rotuer -------------------

    // -------------------- Start Student rotuer -------------------

    // crete note for student
    app.post("/createNote", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      const note = req.body;
      console.log(req.body);
      if (roles === "student") {
        const result = await notecollection.insertOne(note);
        return res.send(result);
      }
    });

    // get all personal note student
    app.get(
      "/getPersonalNote/:email",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const emails = req.params.email;
        if (roles === "student") {
          const result = await notecollection
            .find({ studentEmail: emails })
            .toArray();
          return res.send(result);
        } else {
          return;
        }
      }
    );

    // getpersonal signal note
    app.get(
      "/getPersonalNoteSingl/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        if (roles === "student") {
          const result = await notecollection.findOne(ids);
          return res.send(result);
        } else {
          return;
        }
      }
    );

    // update note
    app.patch("/updateNote/:id", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      const ids = { _id: new ObjectId(req.params.id) };
      const options = { $set: req.body };
      if (roles === "student") {
        const result = await notecollection.updateOne(ids, options);
        return res.send(result);
      } else {
        return;
      }
    });

    // note delete
    app.delete(
      "/deleteNote/:id",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const ids = { _id: new ObjectId(req.params.id) };
        if (roles === "student") {
          const result = await notecollection.deleteOne(ids);
          return res.send(result);
        } else {
          return;
        }
      }
    );

    //booked session
    app.post("/bookedSession", verifytoken, roleChecker, async (req, res) => {
      const roles = req.user;
      const sessiondel = req.body;
      console.log(sessiondel, roles);
      if (roles === "student") {
        const result = await bookedSessioncollection.insertOne(sessiondel);
        return res.send(result);
      } else {
        return;
      }
    });

    // view all booked session
    app.get(
      "/allbooksession/:email",
      verifytoken,
      roleChecker,
      async (req, res) => {
        const roles = req.user;
        const emials = req.params.email;

        if (roles === "student") {
          const findsesstion = await bookedSessioncollection
            .find({ myEmail: emials })
            .toArray();
          const datas = findsesstion.map(
            (item) => new ObjectId(item.mySessionId)
          );
          const query = { _id: { $in: datas } };
          const result = await sessioncollection.find(query).toArray();
          res.send(result)
        }
      }
    );

    // get sigan details
    app.get("/getDetails/:id", async(req, res)=>{
      const ids = {_id : new ObjectId(req.params.id)}
      const result = await sessioncollection.findOne(ids);
      res.send(result)
    })

    // -------------------- End Student rotuer -------------------

    //set user role
    app.post("/user-role-set", async (req, res) => {
      const user = req.body;

      const fins = { "user.email": user.email };
      const existUser = await usercollection.findOne(fins);

      if (existUser) {
        return res.send({ message: "This User Already Exist" }).status(405);
      } else {
        const result = await usercollection.insertOne(user);
        res.send(result);
      }
    });

    // payment Router

    app.post("/payment-money", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentInteregate = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
      });
      res.send({
        clientSecrate: paymentInteregate.client_secret,
      });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(5000, (err) => {
  console.dir(err);
  console.log(`This server is start ${5000}`);
});
