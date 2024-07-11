const express = require('express');
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const {Pool} = require('pg');

const app = express();
const port = 3000;
var ids=[]

const sessionSecret ="your_secret_key";

app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,
    })
);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "random_card",
    password: "April@17#21",
    port: 1721
});

db.connect();

app.get("/", (req, res) => {
    res.render("login.ejs");
});

app.post("/register", async (req, res) => {
    const user = req.body.username;
    const email = req.body.email;
    const pass = req.body.password;
    const account = req.body.account;

    try {
        if (account==='User'){
            await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3, $4)", [user, email, pass]);
        }
        else if(account==='Admin')
        {
            await db.query("INSERT INTO admins (username, email, password) VALUES ($1, $2, $3, $4)", [user, email, pass]);
        }
        res.render("login.ejs");
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/login', async (req, res) => {
    const email = req.body.email;
    const pass = req.body.password;
    const account = req.body.account;

    try {
        let result;
        let typeacc;
    
        if (account === 'User') {
            result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        } else if (account === 'Admin') {
            result = await db.query("SELECT * FROM admin WHERE email = $1", [email]);
            typeacc = 'Admin';
        }
    
        if (result.rows.length > 0) {
            const user = result.rows[0];
    
            if (user.password === pass) {
                req.session.user = { useremail: email,account:account};
                console.log(req.session.user.useremail);
    
                let renderOptions = { useraccount: email };
                if (typeacc === 'Admin') {
                    renderOptions.account = typeacc;
                }
    
                res.render("main.ejs", renderOptions);
            } else {
                res.status(401).send("Invalid Password!!");
            }
        } else {
            res.status(404).send("Invalid email. Not registered!");
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
    
});


app.post("/title", async (req, res) => {
    const user_email = req.session.user.useremail;
    const account=req.session.user.account;
    console.log(user_email)
    let id;
    
    try {
        let res2;
        if (account==='User')
        {
            res2=await db.query("SELECT * FROM users WHERE email = $1", [user_email]);
        }
        else if(account==='Admin')
        {
            res2=await db.query("SELECT * FROM admins WHERE email = $1", [user_email]);
        }

        while (true) {
            id = Math.floor(Math.random() * 25);
            if(!ids.includes(id))
            {
                ids.push(id);
                break;
            }
        }
        console.log(id);

        const result = await db.query("SELECT title FROM titles WHERE id=$1", [id]);
        const line = result.rows[0].title;
        console.log(line);

        res.render("title.ejs", {
            useraccount: user_email,
            title1: line
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/titlesave",async(req,res)=>{
    const user_email = req.session.user.useremail;
    const account=req.session.user.account;
    console.log(user_email)
    let id=ids[(ids.length)-1]

    const result = await db.query("SELECT title FROM titles WHERE id=$1", [id]);
    const line = result.rows[0].title;
    console.log(line);

    try{
        await db.query("INSERT INTO saved (email,title) VALUES ($1,$2)" [user_email,line]);
    }
    catch(error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post("/savedtitles", async (req, res) => {
    const user_email = req.session.user.useremail;
    const account = req.session.user.account;
    console.log(user_email);

    try {
        const res3 = await db.query("SELECT * FROM saved WHERE email = $1", [user_email]);

        if (res3.rows.length > 0) {
            res.render("saved.ejs", {
                lines: res3.rows 
            });
        } else {
            res.render("saved.ejs", {
                status:"NO SAVED STORYLINES TO DISPLAY" 
            });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/deletesavedtitle", async (req, res) => {
    const user_email = req.session.user.useremail;
    const account = req.session.user.account;
    console.log(user_email);
    
    const title = req.body.title;

    try {
        await db.query("DELETE FROM saved WHERE title = $1 and email=$2", [title,user_email]);
        res.render("main.ejs", {
            status: "Mentioned StoryLine Deleted"
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/addtitle",async(req,res)=>{
    const title=req.body.title;

    try {
        await db.query("INSERT INTO titles (title) VALUES ($1)" [title]);
        res.render("main.ejs",{
            status:"New StoryLine Added"
        })
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post("/deletetitle", async (req, res) => {
    const title = req.body.title;

    try {
        await db.query("DELETE FROM titles WHERE title = $1", [title]);
        await db.query("DELETE FROM saved WHERE title = $1", [title]);
        res.render("main.ejs", {
            status: "Mentioned StoryLine Deleted"
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        } else {
            res.render("login.ejs");
        }
    });
});

app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
