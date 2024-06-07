const express = require('express'); 
var bodyParser = require('body-parser');

const app = express(); 
const PORT = 8080;

const i18next = require('i18next');
const FsBackend = require('i18next-fs-backend');
const middleware = require('i18next-express-middleware');
const mysql = require('mysql');


// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.use(express.static('public')); 

const connection = mysql.createConnection({
  host: 'elifguneymsndb.mysql.database.azure.com',
  user: 'elifguney',
  password: 'Test1234',
  database: 'final_project'
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
  .init({
    fallbackLng: 'en',
    preload: ['en', 'tr'], // Preloaded languages
    supportedLngs: ['en', 'tr'], // Languages you want to support
    backend: {
      loadPath: __dirname + '/locales/{{lng}}/{{ns}}.json'
    },
    debug: true // Enable debug mode for i18next
  });
  i18next.on('loaded', (loaded) => {
    console.log('Load path:', i18next.options.backend.loadPath);
  });
// Use i18next middleware
app.use(middleware.handle(i18next));

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));
// Define routes
app.get('/', (req, res) => {
    res.render('home', { i18n: res.locals });
});


// Change language route
app.post('/change-lang', (req, res) => {
  const lang = req.body.lang;
  // Set the selected language as the new language
  i18next.changeLanguage(lang, (err, t) => {
      if (err) return console.log('something went wrong loading', err);
      // Set a cookie or session to remember the selected language
      res.cookie('i18next', lang);
      // Redirect back to the previous page or homepage
      res.redirect('back');
  });
});


app.listen(PORT, (error) =>{ 
	if(!error) 
		console.log("Server is Successfully Running, and App is listening on port "+ PORT) 
	else
		console.log("Error occurred, server can't start", error); 
	} 
); 
