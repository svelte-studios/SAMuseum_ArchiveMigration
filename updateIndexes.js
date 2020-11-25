const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

const { uniqBy, forEach, map, find, sortBy } = require("lodash");
const htmlToText = require("html-to-text");

const url =
  "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
// const url = "mongodb://localhost:27017";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  //_id: "AA8"
  return db
    .collection("Archive_provenance")
    .find({ "legacy.INDEX.0": { $exists: true } })
    .toArray()
    .then(provs => {
      let promiseChain = Promise.resolve();

      forEach(provs, prov => {
        promiseChain = promiseChain.then(() => {
          console.log("Working for Prov ", prov.PROV_ID);
          const indexes = sortBy(
            map(uniqBy(prov.legacy.INDEX, "KeyTerm"), i => {
              const associatedTermObj = find(
                prov.legacy.INDEXING_TERMS,
                t => t.Keyterm === i.KeyTerm
              );
              return {
                queryText: htmlToText.fromString(i.KeyTerm),
                field: i.Source,
                name: associatedTermObj
                  ? htmlToText.fromString(associatedTermObj.Indexterm)
                  : ""
              };
            }),
            idx => idx.name || "Unnamed"
          );

          return db
            .collection("Archive_provenance")
            .updateOne({ _id: prov._id }, { $set: { indexes } });
        });
      });

      return promiseChain.then(() => {
        console.log("Done :)");
        client.close();
      });
    });
});
