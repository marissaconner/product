// https://www.youtube.com/watch?v=zNjVFOo3eO0
const express = require('express');
const serverport = process.env.PORT || 3000;
const db = require('./controllers/mongoctrl.js');

const app = express();

var server = app.listen(serverport, function(){
  console.log( `Server running on ${serverport}!!`);
});

app.get('/api/products/:id', (req, res) => {
  console.log(`Request for product ${req.params.id}`);
  console.log(db)
  db.getProductInfo(req, (err, res) => {
    if (err) {
      res.writeHead(500);
      res.end(err);
    } else {
      res.writehead(200);
      res.end(res);
    }
  });
})

app.get('*', (req, res) => {
  console.log( 'Request catch-all hit!');
  res.writeHead(200);
  res.end()
})

