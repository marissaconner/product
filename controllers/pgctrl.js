const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
const loadSchema = require('../lib/schema.js');
const { rand1k } = require('../lib/randomluts.js');
//const QueryStream = require('pg-query-stream');
const csv = require('csv-stream');
const port = process.env.PGPORT || 5432;
const user = process.env.DBUSER || 'productservice';
const password = process.env.PASSWORD || 'cocacola';
const host = process.env.HOST || 'localhost';
const database = process.env.DATABASE || 'productservice';

const filepath = path.join(__dirname, '..' , 'lib', 'csv');
const PGController = {

  createClient: function() {
    return new Client({
      user,
      password,
      host,
      port,
      database
    });
  },

  connectAndSeed: function(client) {
    client.connect()
    .then(() => {
      console.log( `Postgres connection established on port ${port}.`);
      client.query(loadSchema)
      .then(() => {
        console.log( 'Schema successfully loaded.');
        client.query(

          `COPY products
          FROM '${filepath}/products.csv'
          WITH (format csv, header);

          COPY stores
          FROM '${filepath}/stores.csv'
          WITH (format csv, header);

          COPY locations
          FROM '${filepath}/cities.csv'
          WITH (format csv, header);
          `
        )
        .then(()=>{
          console.log('Data loaded.')
          var count = 0;
          var queue = []

          const makeInventory = function(id){
            count++;
            let values = '';
            for( let i = 0; i < 15; i += 1 ) {
              values += `(${id}, ${rand1k()}),`;
            }
            values += `(${id}, ${rand1k()})`;
            let query = `INSERT INTO products_stores (product_id, store_id) VALUES ${values} RETURNING ID`;
            queue.push(query);

            if( count < 9000 ) {
              // send the next query
              const nextQuery = queue.pop();
              client.query(nextQuery)
              .then((res) => {
                count--;
                console.log('Query sent meter at' + count)
              })
              .catch((err) => {
                console.error(err)
              })
            } else {
              // slow ur horses man. 
              console.log(queue.length + ' queries in line');
            }
          }

          async function streamInventory(stream) {
            for await ( const row of stream ) {
              makeInventory(row[0]);
            }
          }

     //     sql = `SELECT id FROM products`;
      //    var query = new QueryStream(sql);
          // this won't avoid memory leak problems bc you can still load just
          // tons and tons of rows into your application
          // lt's just idk open up that CSV.
          var stream = fs.createReadStream(`${filepath}/products.csv`);
          streamInventory(stream);

          stream.on('end', (data)=>{
            console.log('AAAAAAAAHHHHH!!!!!!');
          });
        })
      })
    })
  }
}

module.exports = PGController; 
