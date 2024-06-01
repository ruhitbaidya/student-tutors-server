require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    // create jwt
    app.post("/jwtCreate", (req, res)=>{
        const email = req.body;
        const token = jwt.sign(email, process.env.TOKEN_SECRATE, {expiresIn : "1hr"})
        res.send({token})
    })

    // user authorization check
    app.post("/verifyuser")
    // Test router
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });


    //user admin student role check
    app.get("/checkRole/:email", async(req, res)=>{
        const email = req.params.email;
        console.log("email",email)
        const finds = {"user.email": email}
        if(!email){
            return res.send({message: "Unauthorize Use"})
        }
        if(email){
            const roles = await usercollection.findOne(finds);
            console.log(roles)
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
        console.log(user)
        const fins = {"user.email" : user.email}
        const existUser = await usercollection.findOne(fins)
        console.log(existUser)
        if(existUser){
            return res.send({message : "This User Already Exist"})
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
