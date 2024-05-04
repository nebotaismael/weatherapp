const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const axios = require("axios");
const app = express();
const bodyParser = require('body-parser');

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve the public folder as static files
app.use(express.static("public"));

// Use body-parser to handle form data
app.use(bodyParser.urlencoded({ extended: false }));

// Use express-session middleware for managing user sessions
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport and use it to manage user authentication state
app.use(passport.initialize());
app.use(passport.session());

// Define a local strategy for Passport to use for authenticating users
passport.use(new LocalStrategy(
  function(username, password, done) {
    if (username === 'admin' && password === 'admin') {
      return done(null, { username: 'admin' });
    } else {
      return done(null, false, { message: 'Invalid credentials.' });
    }
  }
));

// Define how Passport should serialize and deserialize user data
passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  done(null, { username: username });
});

// Define routes for login and logout
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

// Ensure that the user is authenticated for all other routes
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/login');
  }
});

// Your existing routes go here
app.get("/", (req, res) => {
  res.render("index", { weather: null, error: null });
});

app.get("/weather", async (req, res) => {
  const city = req.query.city;
  const apiKey = "fb7196f16e81f6f684c63b04e173cdff";
  const APIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;
  let weather;
  let error = null;
  try {
    const response = await axios.get(APIUrl);
    weather = response.data;
  } catch (error) {
    weather = null;
    error = "Error, Please try again";
  }
  res.render("index", { weather, error });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});