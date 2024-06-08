const express = require('express'); 
require('dotenv').config(); 

var bodyParser = require('body-parser');
const fs = require('fs');

const app = express(); 
const PORT = 8080;

const i18next = require('i18next');
const FsBackend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser'); // Add cookie-parser
const mysql = require('mysql');
const axios = require('axios'); // Add axios for HTTP requests
const moment = require('moment');

const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const LocalStrategy = require('passport-local').Strategy;



// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.use(express.static('public')); 
app.use(cookieParser()); 



// Passport configuration
passport.use(
  new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const query = 'SELECT * FROM users WHERE email = ?';
    connection.query(query, [email], (err, results) => {
      if (err) throw err;
      if (results.length === 0) {
        return done(null, false, { message: 'No user found' });
      }

      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      });
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    done(err, results[0]);
  });
});

// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables for flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});



const connection = mysql.createConnection({
  host: 'elifguneymsndb.mysql.database.azure.com',
  user: 'elifguney',
  password: 'Test1234',
  database: 'final_project',
  ssl: {
    ca: fs.readFileSync(__dirname + '/certs/DigiCertGlobalRootG2.crt.pem'),
        rejectUnauthorized: false
  }
});

// Event: Connection Established
connection.connect((err) => {
  if (err) {
      console.error('Error connecting to MySQL database:', err);
      return;
  }
  console.log('Connected to MySQL database');
});


i18next
  .use(FsBackend)
  .use(i18nextMiddleware.LanguageDetector)  // Add LanguageDetector middleware
  .init({
    fallbackLng: 'en',
    preload: ['en', 'tr'], // Preloaded languages
    supportedLngs: ['en', 'tr'], // Languages you want to support
    backend: {
      loadPath: __dirname + '/locales/{{lng}}/{{ns}}.json'
    },
    debug: false, 
    detection: {
      order: ['cookie', 'querystring', 'header'],
      caches: ['cookie']
    }
  });

  const API_KEY = '5763ac4a4fe14caaa64172029240706';

  // Fetch weather data
  const getWeatherData = async (city) => {
    try {
      const response = await axios.get(`http://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}&aqi=no`);
      return response.data;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  };
  

// Use i18next middleware
app.use(i18nextMiddleware.handle(i18next));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  const query = 'SELECT title, explanation, images, news_id FROM news';
  connection.query(query, async (err, results) => {
    if (err) {
      console.error('Error fetching news data:', err);
      return res.status(500).send('Server error');
    }

  // Fetch weather data for a specific city
  const weatherData = await getWeatherData('Izmir');

  res.render('home', { news: results, weather:weatherData,  i18n: res.locals });

  });
});

// Search route
app.get('/search', (req, res) => {
  const searchTerm = req.query.q;
  const query = 'SELECT title, explanation, images, category, source, inserted_at, news_id FROM news WHERE explanation LIKE ?';
  connection.query(query, [`%${searchTerm}%`], (err, results) => {
    if (err) {
      console.error('Error fetching search results:', err);
      return res.status(500).send('Server error');
    }

    const formattedResults = results.map(item => {
      const hoursSinceInserted = moment().diff(moment(item.inserted_at), 'hours');
      return { ...item, hoursSinceInserted };
    });

    res.render('search', { results: formattedResults, i18n: res.locals });
  });
});


// Change language route
app.post('/change-lang', (req, res) => {
  const lang = req.body.lang;
  console.log('Requested language change to:', lang);
  res.cookie('i18next', lang); // Set the cookie for language
  res.sendStatus(200); // Respond with success
});

app.get('/news/:id', (req, res) => {
  const newsId = req.params.id;
  const query = 'SELECT * FROM news WHERE news_id = ?';
  connection.query(query, [newsId], (err, results) => {
    if (err) {
      console.error('Error fetching news details:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('News not found');
    }

    res.render('news', { news: results[0], user: req.user });
  });
});

// Route to handle like, dislike, and share actions
app.post('/news/:id/like', (req, res) => {
  const newsId = req.params.id;
  const query = 'UPDATE news SET likes = likes + 1 WHERE news_id = ?';
  connection.query(query, [newsId], (err, results) => {
    if (err) {
      console.error('Error liking news:', err);
      return res.status(500).send('Server error');
    }
    res.redirect(`/news/${newsId}`);
  });
});

app.post('/news/:id/dislike', (req, res) => {
  const newsId = req.params.id;
  const query = 'UPDATE news SET dislikes = dislikes + 1 WHERE news_id = ?';
  connection.query(query, [newsId], (err, results) => {
    if (err) {
      console.error('Error disliking news:', err);
      return res.status(500).send('Server error');
    }
    res.redirect(`/news/${newsId}`);
  });
});

app.post('/news/:id/share', (req, res) => {
  const newsId = req.params.id;
  // Implement sharing functionality here
  // For example, generate a shareable link and display it to the user
  res.redirect(`/news/${newsId}`);
});


// Login Page
app.get('/login', (req, res) => res.render('login'));

// Register Page
app.get('/register', (req, res) => res.render('register'));

// Register Handle
app.post('/register', (req, res) => {
  const { name, email, password, password2, country, city } = req.body;
  let errors = [];

  // Check required fields
  if (!name || !email || !password || !password2 || !country || !city) {
    errors.push({ msg: 'Please fill in all fields' });
  }

  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // Check password length
  if (password.length < 8) {
    errors.push({ msg: 'Password should be at least 8 characters' });
  }

  // Check password contains a number and a non-alphanumeric character
  if (!/\d/.test(password) || !/\W/.test(password)) {
    errors.push({ msg: 'Password should contain at least one number and one non-alphanumeric character' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2,
      country,
      city
    });
  } else {
    // Validation passed
    const query = 'SELECT * FROM users WHERE email = ?';
    connection.query(query, [email], (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        errors.push({ msg: 'Email is already registered' });
        res.render('register', {
          errors,
          name,
          email,
          password,
          password2,
          country,
          city
        });
      } else {
        const newUser = { name, email, password, country, city };

        // Hash password
        bcrypt.genSalt(10, (err, salt) => bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;

          // Save user
          const insertQuery = 'INSERT INTO users SET ?';
          connection.query(insertQuery, newUser, (err, results) => {
            if (err) throw err;
            req.flash('success_msg', 'You are now registered and can log in');
            res.redirect('/login');
          });
        }));
      }
    });
  }
});


// Login Handle
app.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Logout Handle
app.get('/logout', (req, res) => {
  req.logout(() => {
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
  });
});


app.listen(PORT, (error) =>{ 
	if(!error) 
		console.log("Server is Successfully Running, and App is listening on port "+ PORT) 
	else
		console.log("Error occurred, server can't start", error); 
	} 
); 
