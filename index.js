const express = require('express');
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const pg = require('pg');

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
    database: "dramatics",
    password: "April@17#21",
    port: 1721 
});

db.connect((err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to the database');
    }
});


app.get("/", (req, res) => {
    res.render("login.ejs");
});

app.get("/signup", (req, res) => {
    res.render("register.ejs");
});


app.post("/register", async (req, res) => {
    const user = req.body.username;
    const email = req.body.email;
    const pass = req.body.password;
    const account = req.body.account;

    try {
        if (account==='User'){
            const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
            if (checkResult.rows.length > 0) {
                return res.status(400).send("Email already registered.");
            }

            await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", [user, email, pass]);
        }
        else if(account==='Admin')
        {
            const checkResult = await db.query("SELECT * FROM admins WHERE email = $1", [email]);
            if (checkResult.rows.length > 0) {
                return res.status(400).send("Email already registered.");
            }

            await db.query("INSERT INTO admins (username, email, password) VALUES ($1, $2, $3)", [user, email, pass]);
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
            result = await db.query("SELECT * FROM admins WHERE email = $1", [email]);
            typeacc = 'Admin';
        }
    
        if (result.rows.length > 0) {
            const user = result.rows[0];
    
            if (user.password === pass) {
                req.session.user = { useremail: email,account:account};
                console.log(req.session.user.useremail,req.session.user.account);
    
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
    const account1=req.session.user.account;
    console.log(user_email,account1)
    let id;
    
    try {
        id = Math.floor(Math.random() * 26)+1;
        ids.push(id)
        console.log(id);

        const result = await db.query("SELECT title FROM titles WHERE id=$1", [id]);
        const line = result.rows[0].title;
        console.log(line);

        let renderOptions = { useraccount: user_email,title1: line };
        if (account1 === 'Admin') {
            renderOptions.account = account1;
        }

        res.render("title.ejs", renderOptions);
        
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/save", async (req, res) => {
    const user_email = req.session.user.useremail;
    const account = req.session.user.account;
    console.log(user_email);
    let id = ids[ids.length - 1];

    try {
        const result = await db.query("SELECT title FROM titles WHERE id=$1", [id]);
        const line = result.rows[0].title;
        console.log(line);

        const resQuery = await db.query("SELECT * FROM saved WHERE email=$1 AND title=$2", [user_email, line]);
        if (resQuery.rows.length > 0) {
            await db.query("DELETE FROM saved WHERE title = $1 AND email=$2", [line, user_email]);
            res.json({ status: 'unsaved'});
        } else {
            await db.query("INSERT INTO saved (email, title) VALUES ($1, $2)", [user_email, line]);
            res.json({ status: 'saved'});
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get("/check-saved-status",(req,res)=>{
    res.json({ status: 'unsaved'});
})

app.get("/home", (req, res) => {
    const account=req.session.user.account;
    res.render("main.ejs",{account:account});
});

app.get("/add", (req, res) => {
    const account=req.session.user.account;
    res.render("add.ejs",{account:account});
});

app.get("/delete", (req, res) => {
    const account=req.session.user.account;
    res.render("delete.ejs",{account:account});
});

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
    console.log(title)

    try {
        const res3 = await db.query("SELECT * FROM titles WHERE title = $1", [title]);

        if (res3.rows.length > 0) {
            res.json({ status: "exists", message: "Storyline already exists" });
        } else {
            await db.query("INSERT INTO titles (title) VALUES ($1)", [title]);
            res.json({ status: "added", message: "Storyline added successfully" });
        }
        
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post("/deletetitle", async (req, res) => {
    const title = req.body.title;

    try {
        const res3 = await db.query("SELECT * FROM titles WHERE title = $1", [title]);

        if (res3.rows.length===0)
        {
            res.json({status:'not'})
        }
        else{
            await db.query("DELETE FROM titles WHERE title = $1", [title]);
            await db.query("DELETE FROM saved WHERE title = $1", [title]);
            
            res.json({status:'exists'})
        }
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
            res.redirect('/');
        }
    });
});

app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
