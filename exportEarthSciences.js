const MongoClient = require("mongodb").MongoClient;
const xml2js = require("xml2js");
const assert = require("assert");
const { readFile } = require("fs");
const { forEach, map } = require("lodash");

const url = "mongodb://localhost:27017";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  readFile(`SAMA_Earth_Sciences.xml`, (err, earthSciencesXML) => {
    xml2js
      .parseStringPromise(earthSciencesXML)
      .then(function(earthSciencesJSON) {
        let promiseChain = Promise.resolve();
        earthSciencesJSON["SAMA-DATA"]["SAMA-RECORD"] = earthSciencesJSON[
          "SAMA-DATA"
        ]["SAMA-RECORD"].slice(0, 10);

        forEach(earthSciencesJSON["SAMA-DATA"]["SAMA-RECORD"], record => {
          forEach(record, (field, key) => {
            if (record[key][0]) {
              record[key.split(":").pop()] = record[key][0];
              record.searchField = !record.searchField
                ? record[key][0]
                : record.searchTerm + ` ${record[key][0]}`;
            }
            delete record[key];
          });

          console.log("record", record);
          promiseChain = promiseChain.then(() =>
            db.collection("Collections_earth_sciences").insertOne(record)
          );
        });

        return promiseChain.then(() => {
          client.close();
        });
      });
  });
});
