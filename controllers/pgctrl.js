const path = require('path');
const { Client } = require('pg');
const loadSchema = require('../lib/schema.js');
const { rand1k } = require('../lib/randomluts.js');
const QueryStream = require('pg-query-stream');
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

          sql = `SELECT id FROM products`;

          var query = new QueryStream(sql);

          var stream = client.query(query);

          stream.on('end', function(){
            console.log('Done');
          })

          stream.on('data', function(data){
            let values = '';
            for( let i = 0; i < 9; i += 1 ) {
              values += `(${data.id}, ${rand1k()}),`;
            }
            values += `(${data.id}, ${rand1k()})`;

            let assoc = `INSERT INTO products_stores (product_id, store_id) VALUES ${values}`;
            stream.pause();
            console.log('wargarbl');
            client.query(assoc)
            .then(()=>{
              stream.resume();
            })
          })

          // const map = new Map(product => [product.id]);

          // products.pipe(map).pipe(what);
          // products.on('error', e => what.emit('error',e));
          // map.on('error', e => what.emit('error',e));
          // console.log(what);
        //   const makeInventory = function( product ) {
        //     let query = 'INSERT INTO products_stores (product_id, store_id, reserved, quantity ) VALUES '; 
        //     for (let i = 0; i < 10; i++ ) {
        //       query += `(${product}, ${rand1k()}, 0, 10),`;
        //     }
        //     query += ';'
        //     return query;
        //   }
        //   for( let i = 0; i < 10000000; i++ ) {
        //     client.query(makeInventory(i));
        //   }
        //   console.log('Done with associations');
        // })
        // .catch((err)=>{
        //   console.error(err);
        // })
        //})
        })
      })
    })
  }
};

module.exports = PGController; 
