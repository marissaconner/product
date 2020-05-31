const path = require('path');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const csv = require('csv-stream');
const { rand10k, rand1k } = require('../lib/randomluts.js');

const port = process.env.MONGOPORT || 27017;
const user = process.env.DBUSER || 'productservice';
const password = process.env.PASSWORD || 'cocacola';
const database = process.env.DATABASE || 'productservice';
const host = process.env.HOST || 'localhost';
const url = `mongodb://${host}:${port}`
const filepath = path.join(__dirname, '..' , 'lib', 'csv');

let db = {};
let models = {
  products: {},
  inventories: {},
  stores: {}
};

MongoClient.connect( url, function(err, client) {
  if(err) {
    console.error(err);
    return;
  }
  console.log('Connection established to Mongo database.');
  db = client.db(database);
  models.products = db.collection('products');
  models.stores = db.collection('stores');
  models.inventories = db.collection('inventories');
})

const MongoController = {

  getProductInfo: function(req, callback) {
    const sku = req.params.id.toString();
    models.products.find({ sku }).toArray()
    .then((product) => {
      if( product.length === 1 ){
        callback(null, product[0]);
      } else {
        const skuConflict = new Error('SKU conflict: more than one product has this SKU.');
        callback(skuConflict, null);
      }     
    })
    .catch((err) => {
      callback(err, null);
    })
  },

  connectAndSeed: function(client) {
    const start = Date.now();
    client.connect(function(err) {
      if(err) {
        console.error(err);
        return;
      }
      const db = client.db(database);
      MongoController.loadCities((err, cities) => {
        if( err ) {
          console.log(err);
          return;
        }
        MongoController.createStores(db, cities, () => {
          if(err) {
            console.log(err);
            return;
          }
          MongoController.createProducts(db, () => {
            MongoController.createInventories(db, () => {
              const finish = Date.now();
              console.log(`Finished in ${start - finish} ms.`)
            });
          });
        });
      })
    });
  },

  loadCities: function(callback) {
    const readCities = fs.createReadStream(`${filepath}/cities.csv`);
    const citiesCsv = csv.createStream();
    let cities = [];
    readCities.pipe(citiesCsv)
      .on('error', (error) => {
       callback( error, null )
      })
      .on('data', (data) => {
        cities.push(data);
      })
      .on('end', (rowCount) => {
        console.log( `${rowCount} cities parsed.`);
        if( callback !== undefined ) {
          callback(null, cities);
        }
      });
  },

  createStores: function(db, cities, callback) {
    const readStores = fs.createReadStream(`${filepath}/stores.csv`);
    const storesCsv = csv.createStream();
    const stores = db.collection('stores');
    let storelist = [];
    readStores.pipe(storesCsv)
      .on('error', (error) => {
        callback(error);
      })
      .on('data', (data) => {
        console.log(data);
        const i = rand1k();
        const currcity = cities[i];
        const store = {
          insertOne: {
            storeId: data.id,
            name: data.name,
            street_number: data.street_number,
            street_number_suffix: data.street_number_suffix,
            street_name: data.street_name,
            street_type: data.street_type,
            street_direction: data.street_direction,
            address_type: data.address_type,
            city: {
              name: currcity.name,
              governing_district: currcity.governing_district,
              country: currcity.country,
              latitude: currcity.latitude,
              longitude: currcity.longitude,
              postal_code: currcity.postal_code
            }
          }
        };
        storelist.push(store);
      })
      .on('end', () => {
        console.log( `Stores parsed.`);
        stores.bulkWrite(storelist)
        .then(function() {
          callback(null);
        })
      })
  },

  createInventories: function(db, callback) {
    const readInventories = fs.createReadStream(`${filepath}/inventories.csv`);
    const inventoriesCsv = csv.createStream();
    const inventories = db.collection('inventories');

    inventories.createIndex({product_id: 1});
    inventories.createIndex({store_id: 1});
    let inventory = [];

    readInventories.pipe(inventoriesCsv)
      .on('error', (error) => {
          console.error(error);
        })
      .on('data', (data) => {
        const row = { insertOne: data };
        inventory.push(row);
        if( inventory.length === 100000 ) {
          readInventories.pause();
          console.log('Bulkwriting');
          inventories.bulkWrite(inventory)
          .then(()=>{
            inventory = [];
            readInventories.resume();
          })
          .catch((err) => {
            console.error(err);
          })  
        }
      })
      .on('end', (rowCount) => {
        console.log(`Inventory parsed.`);
        if( inventory.length > 0 ) {
          inventories.bulkWrite(inventory)
          .catch((err) => {
            console.log("error")
          });
        }
      });
  },

  createProducts: function(db, callback) {
    console.log( Date.now() );
    const readProducts = fs.createReadStream(`${filepath}/products.csv`);
    const productsCsv = csv.createStream();
    const products = db.collection('products');
   
    products.createIndex({ sku: 1 });
  
    let productRows = [];
    let inventory = [];

    readProducts.pipe(productsCsv)
      .on('error', (error) => {
          console.error(error);
        })
      .on('data', (data) => {
        const row = { insertOne: data };
        productRows.push(row);
        if( productRows.length === 100000 ) {
          readProducts.pause();
          console.log('Bulkwriting');   
          products.bulkWrite(productRows)
          .then((res) => {
            productRows = [];
            readProducts.resume();
          })
          .catch((err) => {
            console.error(err);
          })  
        }
      })
      .on('end', (rowCount) => {
        console.log(`Products parsed.`);
        if( productRows.length > 0 ) {
          products.bulkWrite(productRows)
          .then((res) => {
            console.log( `Products loaded into database by ${Date.now()}`);
            callback();
          })
          .catch((err) => {
            console.error(err);
          });
        }
      });
  }
}

   
module.exports = MongoController; 
