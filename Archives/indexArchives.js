require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { Client } = require("@elastic/elasticsearch");
const connectionClass = require("http-aws-es");
const elasticsearch = require("elasticsearch");
// const AwsElastic = require("aws-elasticsearch-client");
const { forEach, find, chunk, filter, map, lowerCase } = require("lodash");
const moment = require("moment");
const AWS = require("aws-sdk");

const autocomplete = require("./autocomplete.js");
const htmlToText = require("html-to-text");

const url =
  "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
// const url = "mongodb://localhost:27017";

// const dbName = "sam_website_staging";
const dbName = "sam_website";
const mongoClient = new MongoClient(url);

const config = {
  awsConfig: new AWS.Config({
    accessKeyId: process.env.ELASTICSEARCH_USERID,
    secretAccessKey: process.env.ELASTICSEARCH_USERSECRET,
    region: "ap-southeast-2",
  }),
  connectionClass,
  hosts: [process.env.ELASTICSEARCH_HOST],
  requestTimeout: 60000,
};

// const elasticClient = new Client({ node: "http://localhost:9200" });
const elasticClient = new elasticsearch.Client(config);

mongoClient.connect(function (err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = mongoClient.db(dbName);
  return Promise.all([
    db
      .collection("Archive_provenance")
      .find({ PROV_ID: { $exists: true, $ne: "" } })
      .toArray(),
    db
      .collection("Archive_series")
      .find({ _id: { $exists: true, $ne: "" } })
      .toArray(),
    db
      .collection("Archive_inventory")
      .find({ _id: { $exists: true, $ne: "" } })
      // .find({ _id: "aa-1-63-40" })
      // .limit(1)
      .toArray(),
    db
      .collection("Archive_tribe")
      .find({
        _id: { $exists: true, $ne: "" },
        "inventory.0": { $exists: true },
      })
      // .find({ _id: "aa-778-13" })
      // .limit(1)
      .toArray(),
  ]).then(([provenances, series, items, tribes]) => {
    const dataset = [];
    // items = items.slice(0, 20000);
    // const foundItem = items.find((item) => item.CONTROL === "AA122/5/1/11");
    // console.log(
    //   "🚀 ~ file: indexArchives.js ~ line 72 ~ forEach ~ foundItem",
    //   foundItem
    // );

    // const relatedSeries = find(series, (s) => s._id === foundItem.SERIES_ID);
    // console.log(
    //   "🚀 ~ file: indexArchives.js ~ line 79 ~ ]).then ~ relatedSeries",
    //   relatedSeries
    // );

    // let relatedProv = {};
    // if (relatedSeries && relatedSeries._id)
    //   relatedProv = find(provenances, (p) => p._id === relatedSeries.PROV_ID);
    // console.log(
    //   "🚀 ~ file: indexArchives.js ~ line 79 ~ ]).then ~ relatedProv",
    //   relatedProv
    // );

    // return;

    let successCount = 0;
    forEach(items, (item) => {
      let relatedSeries = {};
      let relatedProv = {};

      relatedSeries = find(series, (s) => s._id === item.SERIES_ID);

      if (relatedSeries && relatedSeries._id)
        relatedProv = find(provenances, (p) => p._id === relatedSeries.PROV_ID);
      let tribesNames = item.tribeIds
        ? map(
            filter(tribes, (t) => item.tribeIds.includes(t._id)),
            (tribe) => tribe.TTRIBE
          ).join(",")
        : "";

      if (
        relatedProv &&
        relatedProv._id &&
        relatedSeries &&
        relatedSeries._id
      ) {
        successCount++;
        console.log(
          "🚀 ~ file: indexArchives.js ~ line 156 ~ forEach ~ successCount",
          successCount
        );
        relatedProv = { ...relatedProv, ...relatedProv.details };

        dataset.push({
          index: { _index: "archives", _id: item._id },
        });
        const fields = {
          name: htmlToText.fromString(item.TITLEINS),
          slugifiedId: item.slugifiedId,
          description: item.TITLEDET,
          indexField: lowerCase(item.TITLEDET + item.TITLEINS),
          itemId: item._id,
          formats: item.formats ? item.formats.join(", ") : "",
          tribes: tribesNames,
          collectionId: relatedProv._id,
          collectionCode: item.PROV_ID,
          collectionName: htmlToText.fromString(relatedProv.PROV_NAME),
          collectionIndexField: lowerCase(
            `${item.PROV_ID} ` + htmlToText.fromString(relatedProv.PROV_NAME)
          ),
          slugifiedCollectionId: item.slugifiedProvId,
          showLive: relatedProv.showLive,
          seriesId: relatedSeries._id,
          seriesCode: relatedSeries.SERIES_ID,
          itemCode: item.CONTROL,
          seriesName: htmlToText.fromString(relatedSeries.STITLEINS),
          slugifiedSeriesId: item.slugifiedSeriesId,
          type: "item",
          from: item.fromDate || null,
          to: item.toDate || null,
        };

        dataset.push(fields);
      }
    });

    return elasticClient.indices.delete({ index: "archives" }).then(() => {
      return elasticClient.indices
        .create({
          index: "archives",
          body: {
            settings: { ...autocomplete },
            mappings: {
              properties: {
                name: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                  fields: {
                    raw: {
                      type: "keyword",
                    },
                  },
                },
                description: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                },
                indexField: {
                  type: "keyword",
                },
                tribes: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                },
                collectionId: {
                  type: "keyword",
                },
                collectionCode: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                },
                collectionName: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                },
                collectionIndexField: {
                  type: "keyword",
                },
                slugifiedCollectionId: {
                  type: "text",
                },
                showLive: {
                  type: "keyword",
                },
                seriesId: {
                  type: "keyword",
                },
                seriesCode: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                },
                seriesName: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search",
                },
                slugifiedSeriesId: {
                  type: "text",
                },
                itemId: {
                  type: "keyword",
                },
                itemCode: {
                  type: "keyword",
                },
                formats: {
                  type: "text",
                },
                slugifiedId: {
                  type: "text",
                },
                from: { type: "date" },
                to: { type: "date" },
                slug: { type: "text" },
                type: { type: "text" },
              },
            },
          },
        })
        .then(() => {
          const chunkedOps = chunk(dataset, 3000);
          console.log("chunkedOps.length", chunkedOps.length);
          let promiseChain = Promise.resolve();

          forEach(chunkedOps, (subset, index) => {
            console.log("subset.length", subset.length);
            promiseChain = promiseChain.then(() => {
              console.log("indexing chunk ", index);
              return elasticClient
                .bulk({
                  body: subset,
                })
                .catch((err) => {
                  console.log(
                    "🚀 ~ file: indexArchives.js ~ line 229 ~ promiseChain=promiseChain.then ~ err",
                    err
                  );
                });
            });
          });

          return promiseChain
            .then(() => {
              console.log("All Done :)");
              mongoClient.close();
            })
            .catch((err) => {
              console.log(
                "🚀 ~ file: indexArchives.js ~ line 243 ~ returnpromiseChain.then ~ err",
                err
              );
            });
        });
    });
  });
});
