const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { forEach } = require("lodash");
const dayjs = require("dayjs");

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function (err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  //Series linked to AA 266 had a type in their PROV_ID
  return Promise.all([
    db
      .collection("Archive_provenance")
      .find()
      .project({ fromDate: 1, toDate: 1 })
      .toArray(),
    db
      .collection("Archive_series")
      .find()
      .project({ fromDate: 1, toDate: 1 })
      .toArray(),
    db
      .collection("Archive_inventory")
      .find()
      .project({ fromDate: 1, toDate: 1 })
      .toArray(),
  ]).then(([provs, series, items]) => {
    const firstJanProvs = [];
    forEach(provs, (prov) => {
      const fromMonth = dayjs(prov.fromDate).month();
      const fromDate = dayjs(prov.fromDate).date();

      const toMonth = dayjs(prov.toDate).month();
      const toDate = dayjs(prov.toDate).date();

      if (fromMonth === 0 && fromDate === 1 && toMonth === 0 && toDate === 1) {
        firstJanProvs.push(prov._id);
      }
    });
    console.log(
      "🚀 ~ file: setShowOnlyYear.js ~ line 50 ~ .then ~ firstJanProvs.length",
      firstJanProvs.length
    );

    const firstJanSeries = [];
    forEach(series, (series) => {
      const fromMonth = dayjs(series.fromDate).month();
      const fromDate = dayjs(series.fromDate).date();

      const toMonth = dayjs(series.toDate).month();
      const toDate = dayjs(series.toDate).date();

      if (fromMonth === 0 && fromDate === 1 && toMonth === 0 && toDate === 1) {
        firstJanSeries.push(series._id);
      }
    });
    console.log(
      "🚀 ~ file: setShowOnlyYear.js ~ line 50 ~ .then ~ firstJanSeries.length",
      firstJanSeries.length
    );

    const firstJanItems = [];
    forEach(items, (item) => {
      const fromMonth = dayjs(item.fromDate).month();
      const fromDate = dayjs(item.fromDate).date();

      const toMonth = dayjs(item.toDate).month();
      const toDate = dayjs(item.toDate).date();

      if (fromMonth === 0 && fromDate === 1 && toMonth === 0 && toDate === 1) {
        firstJanItems.push(item._id);
      }
    });
    console.log(
      "🚀 ~ file: setShowOnlyYear.js ~ line 50 ~ .then ~ firstJanItems",
      firstJanItems
    );

    return db
      .collection("Archive_provenance")
      .updateMany(
        { _id: { $in: firstJanProvs } },
        { $set: { onlyShowYear: true } }
      )
      .then(() => {
        return db
          .collection("Archive_series")
          .updateMany(
            { _id: { $in: firstJanSeries } },
            { $set: { onlyShowYear: true } }
          )
          .then(() => {
            return db
              .collection("Archive_inventory")
              .updateMany(
                { _id: { $in: firstJanItems } },
                { $set: { onlyShowYear: true } }
              )
              .then(() => {
                client.close();
              });
          });
      });
  });
});
