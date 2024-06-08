const express = require('express'); 
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



// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.use(express.static('public')); 
app.use(cookieParser()); 

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
  const query = 'SELECT title, explanation, images FROM news';
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
  const query = 'SELECT title, explanation, images, category, source, inserted_at FROM news WHERE explanation LIKE ?';
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



app.listen(PORT, (error) =>{ 
	if(!error) 
		console.log("Server is Successfully Running, and App is listening on port "+ PORT) 
	else
		console.log("Error occurred, server can't start", error); 
	} 
); 
