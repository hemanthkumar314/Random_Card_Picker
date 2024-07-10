const express = require('express');
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const {Pool} = require('pg');

const app = express();
const port = 3000;

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


db.connect();

// Routes
app.get("/", (req, res) => {
    res.render("login.ejs");
});


app.post("/register", async (req, res) => {
    const user = req.body.username;
    const email = req.body.email;
    const pass = req.body.password;
    const account = req.body.account;
    const storyline = "story line";

    try {
        await db.query("INSERT INTO users (username, email, password, title) VALUES ($1, $2, $3, $4)", [user, email, pass, storyline]);
        res.render("login.ejs");
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/login', async (req, res) => {
    const email = req.body.email;
    const pass = req.body.password;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length !== 0) {
            if (result.rows[0].password === pass) {
                req.session.user = { useremail: email };
                console.log(req.session.user.useremail);
                res.render("main.ejs", {
                    useraccount: email,
                });
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

app.post("/title", async (req, res) => {
    const user_email = req.session.user.useremail;
    console.log(user_email)
    let id;

    try {
        const res2 = await db.query("SELECT * FROM users WHERE email = $1", [user_email]);

        if (res2.rows[0].length !== 0 && res2.rows[0].title!=='story line') {
        {
            res.render("title.ejs", {
                useraccount: user_email,
                pick:'You already picked ur story Line',
                title1: res2.rows[0].title,
            });
        }
        } else {
            while (true) {
                id = Math.floor(Math.random() * 25); 
                const num = await db.query("SELECT id FROM generated_numbers WHERE generated_num=$1", [id]);
                if (num.rows.length === 0) {
                    await db.query("INSERT INTO generated_numbers (generated_num) VALUES ($1)", [id]);
                    break;
                }
            }
            console.log(id);

            const result = await db.query("SELECT title FROM titles WHERE id=$1", [id]);
            const line = result.rows[0].title;
            console.log(line);
            await db.query("UPDATE users SET title = $1 WHERE email = $2", [line, user_email]);

            res.render("title.ejs", {
                useraccount: user_email,
                title1: line
            });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
