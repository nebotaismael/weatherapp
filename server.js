const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const axios = require("axios");
const bcrypt = require('bcrypt');
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

// In-memory storage for users
const users = {
  'admin': {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin', 10)
  }
};

// Define a local strategy for Passport to use for authenticating users
passport.use(new LocalStrategy(
  function(username, password, done) {
    const user = users[username];
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      return done(null, user);
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
  done(null, users[username]);
});

// Define routes for login, logout and registration
app.get('/login', (_req, res) => {
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

app.get('/register', (_req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  users[username] = {
    username,
    passwordHash: bcrypt.hashSync(password, 10)
  };
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
app.get("/", (_req, res) => {
  res.render("index", { weather: null, error: null });
});

app.get("/weather", async (req, res) => {
  const city = req.query.city;
  const apiKey = "fb7196f16e81f6f684c63b04e173cdff";
  const APIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;
  let weatherData = {};
  let error = null;
  try {
    const response = await axios.get(APIUrl);
    const data = response.data;
    weatherData = {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      description: data.weather[0].description,
      city: data.name,
      country: data.sys.country
    };
  } catch (error) {
    weatherData = null;
    error = "Error, Please try again";
  }
  res.render("index", { weather: weatherData, error });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});