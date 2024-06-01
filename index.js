require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRATE);
const jwt = require("jsonwebtoken")
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
    const sessioncollection = client.db("Student_tutorsDB").collection("sessionCreate");

    // create jwt
    app.post("/jwtCreate", (req, res)=>{
        const email = req.body;
        const token = jwt.sign(email, process.env.TOKEN_SECRATE, {expiresIn : "1hr"})
        res.send({token})
    })

    // check role middleware
    const roleChecker = async(req, res, next)=>{
        const {email} = req.decode;
        const query = {"user.email" : email}
        const userFind = await usercollection.findOne(query)
        if(!userFind){
          res.send({message : "invalid user"})
        }
        if(userFind){
          req.user = userFind.user.role;
          next()
        }
    }
    // user authorization check
    const verifytoken = (req, res, next)=>{
        const token = JSON.parse(req.headers.authorization);
        const datas = token.split(" ")
        if(!datas[2]){
          return res.send({message : "UnAuthorize User"}).status(401)
        }

        // verify tokens
        jwt.verify(datas[2], process.env.TOKEN_SECRATE, (err, decode)=>{
          if(err){
            return res.send({message : "tim UnAuthorize User"}).status(403)
          }
          if(datas[1] === decode.email){
            req.decode = decode;
            next()
          }else{
            return res.send({message : "UnAuthorize User"}).status(403)
          }
        })
        
    }
    // Test router
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // create session router
    app.post("/createSession", verifytoken, roleChecker, async(req, res)=>{
        // console.log(req.body)
        // console.log(req.user)
        const data = req.body;
        const role = req.user;
        if(role === "tutor"){
          const result = await sessioncollection.insertOne(data)
          res.send(result)
        }else{
          return res.send({message : "You Can Not Create Any Session"})
        }
    })

    // get session tutor
    app.get("/sessionfind/:email", verifytoken, roleChecker, async(req, res)=>{
          const findrule = req.user;
          const emails = req.params.email;
          const searchTutor = {
            tutorEmail : emails,
            $or:[
              {status : "approve"},
              {status : "rejected"}
            ]
          }
          if(findrule === "tutor"){
              const result = await sessioncollection.find(searchTutor).toArray()
              console.log(result)
              res.send(result);
          }else{
            return res.send({message : "Invalid User"})
          }
    })

    app.patch("/statusChange/:id", verifytoken, roleChecker, async(req, res)=>{
            const roles = req.user;
            const ids = {_id : new ObjectId(req.params.id)}
            const setData = {$set : {status : "pending"}}
            if(roles === "tutor"){
              const result = await sessioncollection.updateOne(ids, setData);
              res.send(result)
            }
    })
    //user admin student role check
    app.get("/checkRole/:email", verifytoken, async(req, res)=>{
        const email = req.params.email;
        const finds = {"user.email": email}
        if(!email){
            return res.send({message: "min Unauthorize Use"}).status(401)
        }
        if(email){
            const roles = await usercollection.findOne(finds);
            if(roles){
                if(roles.user.role === "admin"){
                    return res.send({roles : "admin"})
                }
                if(roles.user.role === "tutor"){
                    return res.send({roles : "tutor"})
                }
                if(roles.user.role === "student"){
                    return res.send({roles : "student"})
                }
            }
        }
    })

    //set user role
    app.post("/user-role-set", async(req, res)=>{
        const user = req.body;
    
        const fins = {"user.email" : user.email}
        const existUser = await usercollection.findOne(fins)
   
        if(existUser){
            return res.send({message : "This User Already Exist"}).status(405)
        }else{
            const result = await usercollection.insertOne(user);
            res.send(result)
        }
    })

    // payment Router
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body;
      const money = parseInt(price.items * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: money,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
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
