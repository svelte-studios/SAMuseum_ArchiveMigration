const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const url =
  "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
// const url = "mongodb://localhost:27017";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function (err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  //Series linked to AA 266 had a type in their PROV_ID
  const promises = [];

  promises.push(
    db
      .collection("Archive_series")
      .updateMany({ PROV_ID: "AA266" }, { $set: { PROV_ID: "AA 266" } })
  );

  //Series linked to AA 60 had a type in their PROV_ID
  promises.push(
    db
      .collection("Archive_series")
      .updateMany({ PROV_ID: "AA60" }, { $set: { PROV_ID: "AA 60" } })
  );

  promises.push(
    db
      .collection("Archive_inventory")
      .updateMany({ PROV_ID: "SAM01" }, { $set: { PROV_ID: "AA 298" } })
  );

  //Items linked to AA 100/01 had a type in their SERIES_ID
  promises.push(
    db
      .collection("Archive_inventory")
      .updateMany(
        { SERIES_ID: "AA100/01" },
        { $set: { SERIES_ID: "AA 100/01" } }
      )
  );

  //Some series linked to AA662 had a typo in their PROV_ID
  promises.push(
    db
      .collection("Archive_series")
      .updateMany(
        { $or: [{ PROV_ID: "AA 662" }, { PROV_ID: "AA  662" }] },
        { $set: { PROV_ID: "AA662" } }
      )
  );

  //Some series linked to AA22 had a typo in their PROV_ID
  promises.push(
    db
      .collection("Archive_series")
      .updateMany({ PROV_ID: "AA 22" }, { $set: { PROV_ID: "AA22" } })
  );

  //Some items linked to SAMA 1160/1 had a typo in their SERIES_ID
  promises.push(
    db
      .collection("Archive_inventory")
      .updateMany(
        { SERIES_ID: "SAMA1160/1" },
        { $set: { SERIES_ID: "SAMA 1160/1" } }
      )
  );

  //Items linked to Prov AA 281 had a typo in their PROV_ID
  promises.push(
    db
      .collection("Archive_series")
      .updateMany({ PROV_ID: "AA281" }, { $set: { PROV_ID: "AA 281" } })
  );

  return Promise.all(promises);
});
