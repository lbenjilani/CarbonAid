//Import required libraries
const express = require("express"); //Express framework for building the web server
const bodyParser = require("body-parser"); //Middleware to parse incoming form data
const passport = require("passport"); //Authentication middleware
const GoogleStrategy = require('passport-google-oauth20').Strategy;  //Google OAuth 2.0 strategy for Passport

//Initialize the Express application
const app = express();

//Middleware to parse form data sent from the frontend
app.use(bodyparser.urlencoded({ extended: true}));

//Google OAuth Strategy configuration
passport.use(
    new GoogleStrategy(
        {
            clientID: "YOUR_GOOGLE_CLIENT_ID",
            clientSecret: "YOUR_GOOGLE_CLIENT_SECRET",
            callbackURL: "/auth/google/callback"
        },
        (accessToken, refreshToken, profile, done) => {
            console.log(profile);
            done(null,profile);
        }
    )
);

//Serialize user info for session handling
passport.serializeUser((user, done) => {
    done(null, user);
});

//Deserialize user info from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

//Route to handle Google login
app.get(
    "/auth/google",
    passport.authenticate("google", {scope: ["profile", "email"]})
);

app.get(
    "/auth/google/callback",
    passport.authenticate("google", {failureRedirect: "/login"
    }),
    (req, res) => {
        //Successful login
        res.redirect("/");
    }
);

//Regular Login Route
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    //Validate user credentials from the database
    res.send("regular login successful!")
});

// Regular Signup Route
app.post("/login", (req, res) => {
    const {name, email, username, password } = req.body;
    //Save user to databse
    res.send("Signup Successful!");
});

app.listen(3000, ()=> console.log("Server running on http://localhost:3000"));