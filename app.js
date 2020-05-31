// https://www.youtube.com/watch?v=zNjVFOo3eO0
const http = require('http');
const express = require('express');
const serverport = process.env.PORT || 3000;
const database = 'mongo';
const db = require(`./controllers/${database}ctrl.js`);

const app = express();

var server = app.listen(serverport, function(){
  console.log( `Server running on ${serverport}!!`);
});

app.get('/api/products/:id', (req, res) => {
  console.log(`Request for product ${req.params.id}`);
  db.getProductInfo(req, (err, doc) => {
    if (err) {
      res.status(500).send(err);
      return;
    } else {
      res.status(200).send(JSON.stringify(doc));
    }
  });
})

app.get('*', (req, res) => {
  res.status(200).send()
})

