const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const axios = require("axios");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

const users = {
  'admin': {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin', 10)
  }
};

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

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  done(null, users[username]);
});

// Google OAuth2 setup omitted for brevity

const CLIENT_ID = '395265978172-um7nhhj25nphbcf0idtgeej997e03kbd.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// Initiates the Google Login flow
app.get('/auth/google', (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
  console.log("Redirecting to Google Login:", url);
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange authorization code for access token
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token, id_token } = data;

    // Use access_token or id_token to fetch user profile
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Save user profile credentials
    const { email, name } = profile;
    users[name] = {
      username: name,
      passwordHash: bcrypt.hashSync('password', 10) // You might want to replace this with a more secure method
    };
    console.log("Google Login successful. User profile saved:", users[email]);
  
    
console.log(users);
res.redirect('/');
   
  } catch (error) {
    console.error('Error:', error.response.data.error);
    res.redirect('/login');
  }
});


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
  console.log(users);
  res.redirect('/login');
});

app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/login');
  }
});

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
    console.log("Fetching weather data for city:", city);
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
    console.error("Error fetching weather data:", error);
    weatherData = null;
    error = "Error, Please try again";
  }
  console.log("Rendering index page with weather data:", weatherData);
  res.render("index", { weather: weatherData, error });
});

let blogPosts = [
  { id: 1, title: "Default Post", content: "This is a default blog post." }
];

app.get("/blog", (_req, res) => {
  res.render("blog", { posts: blogPosts });
});

app.get("/blog/new", (_req, res) => {
  res.render("new-post");
});

app.post("/blog", (req, res) => {
  const { title, content } = req.body;
  const newPost = { id: blogPosts.length + 1, title, content };
  blogPosts.push(newPost);
  res.redirect("/blog");
});

app.get("/blog/:id", (req, res) => {
  const post = blogPosts.find(p => p.id === parseInt(req.params.id));
  if (post) {
    res.render("post", { post });
  } else {
    res.status(404).send("Post not found");
  }
});

app.get("/blog/edit/:id", (req, res) => {
  const post = blogPosts.find(p => p.id === parseInt(req.params.id));
  if (post) {
    res.render("edit-post", { post });
  } else {
    res.status(404).send("Post not found");
  }
});

app.post("/blog/edit/:id", (req, res) => {
  const { title, content } = req.body;
  const postId = parseInt(req.params.id);
  const postIndex = blogPosts.findIndex(p => p.id === postId);
  if (postIndex !== -1) {
    blogPosts[postIndex] = { ...blogPosts[postIndex], title, content };
    res.redirect("/blog");
  } else {
    res.status(404).send("Post not found");
  }
});

app.post("/blog/delete/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  blogPosts = blogPosts.filter(p => p.id !== postId);
  res.redirect("/blog");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
