const { forEach, map, uniq, concat } = require("lodash");
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
      let itemsIdsWithTribes = [];

      forEach(tribes, t => {
        const itemIds = map(t.inventory, i => i.Item_id);
        itemsIdsWithTribes = concat(itemsIdsWithTribes, itemIds);
      });

      const uniqItemIds = uniq(itemsIdsWithTribes);
      console.log("uniqItemIds", uniqItemIds);

      return db
        .collection("Archive_inventory")
        .find({ ITEM_ID: { $in: uniqItemIds } })
        .toArray()
        .then(items => {
          let promiseChain = Promise.resolve();
          forEach(items, item => {
            console.log("item", item);
            promiseChain = promiseChain.then(() => {
              return db
                .collection("Archive_tribe")
                .find({ "inventory.Item_id": item.ITEM_ID })
                .toArray()
                .then(tribes => {
                  const tribeIds = map(tribes, t => t._id);
                  return db
                    .collection("Archive_inventory")
                    .updateOne({ _id: item._id }, { $set: { tribeIds } });
                });
            });
          });
          return promiseChain.then(() => {
            console.log("All Done : )");
            client.close();
          });
        });
    });
});

// client.connect(function(err) {
//   assert.equal(null, err);
//   console.log("Connected successfully to server");

//   const db = client.db(dbName);
//   return db
//     .collection("Archive_inventory")
//     .find()
//     .toArray()
//     .then(items => {
//       let promiseChain = Promise.resolve();
//       let current = 0;
//       forEach(items, i => {
//         promiseChain = promiseChain.then(() => {
//           console.log("current", current);
//           return db
//             .collection("Archive_tribe")
//             .find({ "inventory.Item_id": i.ITEM_ID })
//             .toArray()
//             .then(tribes => {
//               tribeIds = map(tribes, t => t._id);
//               return db
//                 .collection("Archive_inventory")
//                 .updateOne({ _id: i._id }, { $set: { tribeIds } })
//                 .then(() => {
//                   current++;
//                 });
//             });
//         });
//       });

//       return promiseChain.then(() => {
//         console.log("All Done : )");
//         client.close();
//       });
//     });
// });
