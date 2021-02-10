const forEach = require("lodash").forEach;
const map = require("lodash").map;
const merge = require("lodash").merge;
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/HDMS/";
const { readdirSync } = require("fs");
const csv = require("csvtojson");
const getCsvFiles = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => {
      return dirent.name.toLowerCase().substr(-3) === "csv";
    })
    .map(dirent => dirent.name);
const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// Connection URL
const url = "mongodb://localhost:27017";
// Database Name
const dbName = "demoMigration";
// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  folders = getDirectories(MIGRATION_DIR);
  let directoryPromise = [];
  forEach(folders, folder => {
    directoryPromise.push(readAndExecute(folder));
  });
  const db = client.db(dbName);

  Promise.all(directoryPromise)
    .then(folderLvlResults => {
      let dbPromise = [];
      forEach(folderLvlResults, (csvFiles, $index) => {
        forEach(csvFiles, document => {
          var collectionName =
            folders[$index] +
            "_" +
            document[0].substr(0, document[0].length - 4);
          if (document[1].length > 0) {
            dbPromise.push(
              db.collection(collectionName).insertMany(document[1])
            );
          }
        });
      });
      return dbPromise;
    })
    .then(result => {
      console.log("DB Promise");
      console.log(result.length);
      console.log(result);
      Promise.all(result).then(results => {
        client.close();
      });
    });
});

function readCsv(filePath) {
  return csv()
    .fromFile(filePath)
    .then(function(jsonArrayObj) {
      //when parse finished, result will be emitted here.
      //console.log(jsonArrayObj);
      return jsonArrayObj;
    });
  // .catch(err => {
  //     console.log(filePath + " " + err);
  // })
}

function readAndExecute(folder) {
  var masterJson = {};
  var promises = [];
  var fileArray = getCsvFiles(MIGRATION_DIR + folder);
  forEach(fileArray, fileName => {
    //console.log("HEELL");
    promises.push(readCsv(MIGRATION_DIR + folder + "/" + fileName));
  });
  return Promise.all(promises).then(results => {
    var c = fileArray.map(function(filename, i) {
      return [filename, results[i]];
    });
    return c;
  });
}
