const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hybglgu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("taskManager").collection("users");
        const taskCollection = client.db("taskManager").collection("tasks");
        const reviewCollection = client.db("taskManager").collection("reviews");

        //jwt related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
            res.send({ token });
        })

        //middleware
        const verifyToken = (req, res, next) => {
            console.log('inside verify token: ', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "forbidden access" })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        // const verifyAdmin = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email };
        //     const user = await userCollection.findOne(query);
        //     const isAdmin = user?.role === 'admin';
        //     if (!isAdmin) {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }
        //     next();
        // }

        //users related API
        app.get("/users", verifyToken, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            res.send(user);
        })


        // app.get('/users/admin/:email', verifyToken, async (req, res) => {
        //     const email = req.params.email;
        //     if (email !== req.decoded.email) {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }

        //     const query = { email: email };
        //     const user = await userCollection.findOne(query);
        //     let admin = false;
        //     if (user) {
        //         admin = user?.role === 'admin';
        //     }
        //     res.send({ admin });
        // })

        app.post('/users', async (req, res) => {
            const user = req.body;
            //insert email if user does not exist
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        // app.get("/carts", async (req, res) => {
        //     const email = req.query.email;
        //     const query = { email: email };
        //     const result = await cartCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.post('/tasks', async (req, res) => {
            const cartItem = req.body;
            const result = await taskCollection.insertOne(cartItem);
            res.send(result);
        })

        app.get("/tasks/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await taskCollection.findOne(query);
            res.send(result);
        })

        app.get("/tasks", async (req, res) => {
            const result = await taskCollection.find().toArray();
            res.send(result);
        })

        app.patch('/tasks/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const task = await taskCollection.findOne({ _id: new ObjectId(id) });

                if (!task) {
                    return res.status(404).json({ message: 'Task not found' });
                }

                const updatedCompleted = !task.completed;

                const result = await taskCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { completed: updatedCompleted } }
                );

                if (result.modifiedCount === 1) {
                    res.json({ message: 'Task updated successfully', updatedCompleted });
                } else {
                    res.status(500).json({ message: 'Failed to update task' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });


        app.delete('/tasks/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await taskCollection.deleteOne(query);
            res.send(result);
            console.log("Delete: ", res);
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Task is running');
})

app.listen(port, () => {
    console.log(`Task manager is listening on ${port}`);
})