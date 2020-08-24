require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { Client } = require("@elastic/elasticsearch");
const connectionClass = require("http-aws-es");
const elasticsearch = require("elasticsearch");
// const AwsElastic = require("aws-elasticsearch-client");
const { forEach, find, chunk } = require("lodash");
const moment = require("moment");
const AWS = require("aws-sdk");

const autocomplete = require("./autocomplete.js");

const url = "mongodb://localhost:27017";

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

const elasticClient = new Client({ node: "http://localhost:9200" });
// const elasticClient = new elasticsearch.Client(config);

function formatDate(date) {
  if (!date) return "";
  if (date.match(/\//)) {
    return moment(date, "DD/MM/YYYY").toDate();
  }
  if (date.match(/ /)) {
    if (date.match(/[A-Z]/i)) {
      return moment(date, "DD MMM YYYY").toDate();
    }
    return moment(date, "DD MM YYYY").toDate();
  }
  return moment(date).toDate() || "";
}

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
      // .find({ _id: "aa-778-13" })
      // .limit(1)
      .toArray()
  ]).then(([provenances, series, items]) => {
    const dataset = [];
    forEach(items, item => {
      const relatedSeries = find(series, s => s.SERIES_ID === item.SERIES_ID);
      let relatedProv = find(provenances, p => p.PROV_ID === item.PROV_ID);
      if (relatedProv && relatedSeries) {
        relatedProv = { ...relatedProv, ...relatedProv.PROVENANCE[0] };

        dataset.push({
          index: { _index: "archives", _id: item._id }
        });
        const fields = {
          name: item.TITLEINS,
          description: item.TITLEDET,
          collectionName: item.IPROVENANC,
          collectionId: item.PROV_ID,
          slugifiedCollectionId: item.slugifiedProvId,
          seriesName: relatedSeries.STITLEINS,
          seriesId: item.SERIES_ID,
          slugifiedSeriesId: item.slugifiedSeriesId,
          itemId: item.CONTROL,
          formats: item.formats || "",
          slug: item.slug,
          type: "item"
        };

        if (formatDate(relatedProv.PSTARTDATE))
          fields.from = formatDate(relatedProv.PSTARTDATE);
        if (formatDate(relatedProv.PENDDATE))
          fields.to = formatDate(relatedProv.PENDDATE);

        dataset.push(fields);
      }
    });

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
              collectionId: {
                type: "text"
              },
              collectionName: {
                type: "text",
                analyzer: "autocomplete",
                search_analyzer: "autocomplete_search"
              },
              slugifiedCollectionId: {
                type: "text"
              },
              seriesId: {
                type: "text"
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
                type: "text"
              },
              formats: {
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
        const chunkedOps = chunk(dataset, 5000);
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
        // return elasticClient
        //   .bulk({
        //     body: dataset
        //   })
        return promiseChain.then(() => {
          console.log("All Done :)");
          mongoClient.close();
        });
      });
  });
});
