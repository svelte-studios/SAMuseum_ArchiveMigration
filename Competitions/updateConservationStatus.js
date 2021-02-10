const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { forEach } = require("lodash");
require("dotenv").config();

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  return db
    .collection("competitionEntries")
    .find({ status: { $exists: true } })
    .toArray()
    .then(entries => {
      forEach(entries, e => {
        return db.collection("competitionEntries").update(
          { _id: e._id },
          {
            $set: { conservationStatus: e.status },
            $unset: { status: 1 }
          }
        );
      });
    });
});
