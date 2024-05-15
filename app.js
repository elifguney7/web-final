const express = require('express'); 

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
    }
  });
  console.log(__dirname); // Should output something like 'C:\Users\elifg\OneDrive\Masaüstü\web-final'

// Use i18next middleware
app.use(middleware.handle(i18next));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Define routes
app.get('/', (req, res) => {
    res.render('home', { i18n: res.locals });
});

// Change language route
app.post('/change-lang', (req, res) => {
    res.cookie('i18next', req.body.lang);
    res.redirect('back');
});

// app.get('/', (req, res)=>{ 
// 	res.status(200); 
// 	res.send("Welcome to root URL of Server"); 
// }); 

app.listen(PORT, (error) =>{ 
	if(!error) 
		console.log("Server is Successfully Running, and App is listening on port "+ PORT) 
	else
		console.log("Error occurred, server can't start", error); 
	} 
); 
