const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { Client } = require("@elastic/elasticsearch");
const { forEach, find } = require("lodash");
const moment = require("moment");

const autocomplete = require("./autocomplete.js");

const url = "mongodb://localhost:27017";

const dbName = "sam_website";
const mongoClient = new MongoClient(url);

const elasticClient = new Client({ node: "http://localhost:9200" });

function formatDate(date) {
  console.log("formatDate -> date", date);
  if (!date) return "";
  if (date.match(/\//)) {
    return moment(date, "DD/MM/YYYY").toDate();
  }
  if (date.match(/ /)) {
    return moment(date, "DD MM YYYY").toDate();
  }
  return moment(date).toDate();
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
      // .limit(100)
      .toArray()
  ]).then(([provenances, series, items]) => {
    const dataset = [];
    forEach(items, item => {
      const relatedSeries = find(series, s => s.SERIES_ID === item.SERIES_ID);
      let relatedProv = find(provenances, p => p.PROV_ID === item.PROV_ID);
      if (relatedProv && relatedSeries) {
        relatedProv = { ...relatedProv, ...relatedProv.PROVENANCE[0] };

        console.log("item.TITLEINS", item.TITLEINS);

        dataset.push({
          index: { _index: "archives", _id: item._id }
        });
        dataset.push({
          name: item.TITLEINS,
          description: item.TITLEDET,
          provenanceName: item.IPROVENANC,
          provenanceId: item.PROV_ID,
          slugifiedProvId: item.slugifiedProvId,
          seriesName: relatedSeries.STITLEINS,
          seriesId: item.SERIES_ID,
          slugifiedSeriesId: item.slugifiedSeriesId,
          itemId: item.CONTROL,
          formats: item.formats,
          from: formatDate(relatedProv.PSTARTDATE),
          to: formatDate(relatedProv.PENDDATE),
          slug: item.slug,
          type: "item"
        });
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
              provenanceId: {
                type: "text"
              },
              provenanceName: {
                type: "text",
                analyzer: "autocomplete",
                search_analyzer: "autocomplete_search"
              },
              slugifiedProvId: {
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
        return elasticClient
          .bulk({
            body: dataset
          })
          .then(() => {
            console.log("All Done :)");
            mongoClient.close();
          });
      });
  });
});
