const { forEach, map, uniq, concat, difference } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  return db
    .collection("Archive_tribe")
    .find({ "inventory.0": { $exists: true } })
    .toArray()
    .then(tribes => {
      let totalLinkedItems = [];
      forEach(tribes, tribe => {
        let links = map(tribe.inventory, i => i.Identifier);
        totalLinkedItems = concat(totalLinkedItems, links);
      });

      const uniqItems = uniq(totalLinkedItems);
      console.log("uniqItems.length", uniqItems.length);
      return db
        .collection("Archive_inventory")
        .find({ "tribeIds.0": { $exists: true } })
        .toArray()
        .then(items => {
          const uniqItemsNew = map(items, i => i.CONTROL);
          console.log("uniqItemsNew.length", uniqItemsNew.length);
          const notIncluded = difference(uniqItems, uniqItemsNew);
          console.log("notIncluded.length", notIncluded.length);
          console.log("notIncluded", notIncluded);
        });
    });
});
