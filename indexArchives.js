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
    region: "ap-southeast-2"
  }),
  connectionClass,
  hosts: [process.env.ELASTICSEARCH_HOST],
  requestTimeout: 60000
};

// const elasticClient = new Client({ node: "http://localhost:9200" });
const elasticClient = new elasticsearch.Client(config);

mongoClient.connect(function(err) {
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
        "inventory.0": { $exists: true }
      })
      // .find({ _id: "aa-778-13" })
      // .limit(1)
      .toArray()
  ]).then(([provenances, series, items, tribes]) => {
    const dataset = [];
    forEach(items, item => {
      let relatedSeries = {};
      let relatedProv = {};

      relatedSeries = find(series, s => s.SERIES_ID === item.SERIES_ID);

      if (relatedSeries && relatedSeries._id)
        relatedProv = find(
          provenances,
          p => p.PROV_ID === relatedSeries.PROV_ID
        );
      let tribesNames = item.tribeIds
        ? map(
            filter(tribes, t => item.tribeIds.includes(t._id)),
            tribe => tribe.TTRIBE
          ).join(",")
        : "";

      if (
        relatedProv &&
        relatedProv._id &&
        relatedSeries &&
        relatedSeries._id
      ) {
        relatedProv = { ...relatedProv, ...relatedProv.details };

        dataset.push({
          index: { _index: "archives", _id: item._id }
        });
        const fields = {
          name: htmlToText.fromString(item.TITLEINS),
          description: item.TITLEDET,
          indexField: lowerCase(item.TITLEDET + item.TITLEINS),
          tribes: tribesNames,
          collectionId: relatedProv._id,
          collectionName: htmlToText.fromString(relatedProv.PROV_NAME),
          collectionCode: item.PROV_ID,
          collectionIndexField: lowerCase(
            `${item.PROV_ID} ` + htmlToText.fromString(relatedProv.PROV_NAME)
          ),
          slugifiedCollectionId: item.slugifiedProvId,
          showLive: relatedProv.showLive,
          seriesId: relatedSeries._id,
          seriesName: htmlToText.fromString(relatedSeries.STITLEINS),
          seriesCode: item.SERIES_ID,
          slugifiedSeriesId: item.slugifiedSeriesId,
          itemId: item._id,
          itemCode: item.CONTROL,
          formats: item.formats ? item.formats.join(", ") : "",
          slugifiedId: item.slugifiedId,
          type: "item"
        };

        if (item.fromDate) fields.from = item.fromDate;
        if (item.toDate) fields.to = item.toDate;

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
                      type: "keyword"
                    }
                  }
                },
                description: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search"
                },
                indexField: {
                  type: "keyword"
                },
                tribes: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search"
                },
                collectionId: {
                  type: "keyword"
                },
                collectionCode: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search"
                },
                collectionName: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search"
                },
                collectionIndexField: {
                  type: "keyword"
                },
                slugifiedCollectionId: {
                  type: "text"
                },
                showLive: {
                  type: "keyword"
                },
                seriesId: {
                  type: "keyword"
                },
                seriesCode: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search"
                },
                seriesName: {
                  type: "text",
                  analyzer: "autocomplete",
                  search_analyzer: "autocomplete_search"
                },
                slugifiedSeriesId: {
                  type: "text"
                },
                itemId: {
                  type: "keyword"
                },
                itemCode: {
                  type: "keyword"
                },
                formats: {
                  type: "text"
                },
                slugifiedId: {
                  type: "text"
                },
                from: { type: "date" },
                to: { type: "date" },
                slug: { type: "text" },
                type: { type: "text" }
              }
            }
          }
        })
        .then(() => {
          const chunkedOps = chunk(dataset, 3000);
          console.log("chunkedOps.length", chunkedOps.length);
          let promiseChain = Promise.resolve();

          forEach(chunkedOps, (subset, index) => {
            console.log("subset.length", subset.length);
            promiseChain = promiseChain.then(() => {
              console.log("indexing chunk ", index);
              return elasticClient.bulk({
                body: subset
              });
            });
          });

          return promiseChain.then(() => {
            console.log("All Done :)");
            mongoClient.close();
          });
        });
    });
  });
});
