const { map, filter } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

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
  return db
    .collection("Archive_provenance")
    .find()
    .toArray()
    .then(provs => {
      const ops = map(provs, prov => {
        return {
          updateOne: {
            filter: { _id: prov._id },
            update: {
              $set: {
                image: {
                  imageId: encodeURIComponent(
                    `archives/${prov.PROV_ID}/${prov.PROV_ID}_archives`
                  )
                }
              }
            }
          }
        };
      });

      return db
        .collection("Archive_provenance")
        .bulkWrite(ops, { ordered: false })
        .then(() => {
          provs = filter(provs, p => p.PROV_ID === "AA8");
          const imageCollectionOps = map(provs, prov => {
            console.log(
              "imageId",
              encodeURIComponent(
                `archives/${prov.PROV_ID}/${prov.PROV_ID}_archives`
              )
            );
            return {
              updateOne: {
                filter: {
                  _id: encodeURIComponent(
                    `archives/${prov.PROV_ID}/${prov.PROV_ID}_archives`
                  )
                },
                update: {
                  $set: {
                    name: `${prov.PROV_NAME}_imported`,
                    version: "v2",
                    type: "image/jpeg"
                  }
                },
                upsert: true
              }
            };
          });
          console.log("imageCollectionOps", imageCollectionOps);
          // return db
          //   .collection("images")
          //   .bulkWrite(imageCollectionOps, { ordered: false });
        });
    });
});
