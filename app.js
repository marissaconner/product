// https://www.youtube.com/watch?v=zNjVFOo3eO0
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');

const loadSchema = require('./schema.js');

const port = process.env.PORT || 5432;
const user = process.env.DBUSER || 'productservice';
const password = process.env.PASSWORD || 'cocacola';
const host = process.env.HOST || 'localhost';
const database = process.env.DATABASE || '';
const serverport = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
const routes = require('./routes.js')(app);

const client = new Client({
  user,
  password,
  host,
  port,
  database
});

client.connect()
  .then(()=> {
    console.log(`Connected to database on port ${port}`);
    client.query(loadSchema)
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.error(error);
    })
  })
  .catch((error)=>{
    console.error(`Error connecting to database: ${error}`)
  })

var server = app.listen(serverport, function(){
  console.log( `Server running on ${serverport}!!`);
});

