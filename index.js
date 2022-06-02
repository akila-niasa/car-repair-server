const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors');
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jquts.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect()
        const CarCollection = client.db("carStore").collection("services")
        const orderCollection = client.db("carStore").collection("orders")
        const feedbackCollection = client.db("carStore").collection("userfeedback");
        const userCollection = client.db("carStore").collection("users")
        const paymentCollection = client.db("carStore").collection("payment")


         //user PUT for google
         app.put('/user/:email', async (req, res) => {
          const email = req.params.email;
          const user = req.body;
          const filter = { email: email };
          const options = { upsert: true };
          const updateDoc = {
              $set: user,
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);

          const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
          //   console.log(result);
          res.send({ result, accessToken: token });
      })

        //(GET) all product 
        app.get('/service', async (req, res) => {
            const data = req.query;
            const cursor = CarCollection.find(data);
            const result = await cursor.toArray();
            // console.log(result);
            res.send(result);
        });

         //(GET) single product 
         app.get("/service/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await CarCollection.findOne(query);
            res.send(result);
        })

        //(POST) Order save
        app.post("/saveorder", async (req, res) => {
            order = req.body;
            const result = await orderCollection.insertOne(order);
            res.json(result);
        });

        //(GET) All Orders Or Single user Orders
    app.get("/orders", async (req, res) => {
        let query = {};
        if (req.query.email) {
          query = { user: req.query.email };
        }
        const cursor = orderCollection.find(query);
        const result = await cursor.toArray();
        res.json(result);
      });

      //(DELETE) DELETE Order
      app.delete("/deleteorder/:id", async (req, res) => {
        const productId = req.params.id;
       
        const query = { _id: ObjectId(productId) };
        const result = await orderCollection.deleteOne(query);
        res.json(result);
    });

    // (POST)Post FeedbackInfo
    app.post('/userFeedbackInfo', (req, res) => {
        const newUserFeedback = req.body;
        // console.log('adding service info', newUserFeedback)
        feedbackCollection.insertOne(newUserFeedback)
      .then(result =>{
        // console.log('inserted count',result.insertedCount)
        res.send(result.insertedCount > 0)
      });
  
      });

    //   (GET)Get FeedbackInfo
      app.get('/userfeedback', (req, res) => {
        feedbackCollection.find()
        .toArray((err, feedback) => {
          res.status(200).send(feedback)
        })
      })

       //(GET)Get all User
       app.get("/user", async (req, res) => {
        const cursor = userCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      });

      //   (PUT)Put For Make an admin
      app.put('/user/admin/:email',async(req,res)=>{
        const email=req.params.email;
            const filter={email:email};
            const updateDoc = {
                $set:{role:'admin'},
              };
              const result = await userCollection.updateOne(filter, updateDoc);
         res.send(result);
    });

     // (GET)Get A Admin
     app.get('/useadmin/:email',async(req,res)=>{
      const email=req.params.email;
      const user=await userCollection.findOne({email:email});
      const isAdmin=user.role==='admin';
      res.send({admin:isAdmin});
  });

   //   (GET)Get All Orders For Admin
   app.get('/order',async(req,res)=>{
    const result = await orderCollection.find().toArray();
    res.send(result);
  })

   //(PUT) Update Order Status
   app.put("/order/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const updateDoc = {
      $set: {
        status: req.body.status,
      },
    };
    const result = await orderCollection.updateOne(query, updateDoc);
    res.json(result);
  });

  // (POST)Post add data
  app.post('/addService', (req, res) => {
    const newServiceInfo = req.body;
    // console.log('adding service info', newServiceInfo)
    CarCollection.insertOne(newServiceInfo)
  .then(result =>{
    // console.log('inserted count',result.insertedCount)
    res.send(result.insertedCount > 0)
  });

  });

   //(DELETE) DELETE product
   app.delete("/deleteproduct/:id", async (req, res) => {
    const productId = req.params.id;
    // console.log(productId);
    const query = { _id: ObjectId(productId) };
    const result = await CarCollection.deleteOne(query);
    res.json(result);
  });

  // (GET) Get Order For Payment
  app.get('/order/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await orderCollection.findOne(query);
    res.send(result);
});

 // (POST) Post For Payment
 app.post('/create-payment-intent',async(req,res)=>{
  const order=req.body;
  const price=order.price;
  const ammount=price*100;
  const paymentIntent = await stripe.paymentIntents.create({
      amount: ammount,
      currency: "usd",
      payment_method_types:['card'],
    });
    res.send({clientSecret: paymentIntent.client_secret});
})

//(PATCH) Patch Order Data
app.patch('/order/:id',async(req, res) =>{
  const id  = req.params.id;
  const payment = req.body;
  const filter = {_id: ObjectId(id)};
  const updatedDoc = {
    $set: {
      paid: true,
      transactionId: payment.transactionId
    }
  }
  const result = await paymentCollection.insertOne(payment);
  const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
  res.send(updatedBooking);
})


    }
    finally{

    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Welcome in My CarRepair Server side')
})
app.listen(port, () => { console.log('CURD is running', port) })