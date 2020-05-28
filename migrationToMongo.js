const { forEach, map, toLower, find, pickBy, identity } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/HDMS/"; //process.cwd() + "/mongo/archiveMigration/"
const { readdirSync } = require("fs");
const csv = require("csvtojson");
const slugify = require("slugify");
const MAIN_FILES = [
  "SERIES",
  "PROVENANCE",
  "INVENTORY",
  "METADATA",
  "ACCESSION",
  "ORGANISATION",
  "HTMLPHOTOS",
  "REFERENCES"
];
const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

const getCsvFiles = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => {
      return dirent.name.toLowerCase().substr(-3) === "csv";
    })
    .map(dirent => dirent.name);

// Connection URL
// const url =
//   "mongodb+srv://jake:nSTpXARKE48oeRCU@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";
// Database Name
const dbName = "sam_website";
// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  directoryPromise = [];
  forEach(getDirectories(MIGRATION_DIR), folder => {
    if (
      folder.toLowerCase().substr(0, 2) === "aa" ||
      folder.toLowerCase().substr(0, 4) === "sama"
    ) {
      directoryPromise.push(readAndExecute(folder));
    }
  });
  Promise.all(directoryPromise)
    .then(results => {
      let promiseChain = Promise.resolve();
      forEach(results, doc => {
        if (doc.PROV_ID) {
          doc.slug = `/collection/archives/provenances/${slugify(
            doc.PROV_ID.replace(/\//, "-"),
            { lower: true }
          )}`;
          doc.slugifiedId = slugify(doc.PROV_ID.replace(/\//, "-"), {
            lower: true
          });

          forEach(doc.PROVENANCE, p => {
            p.PFULLNOTE =
              "<p>" +
              p.PFULLNOTE.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") +
              "</p>";
          });
        }

        if (
          doc.TYPE === "Person" &&
          doc.PROV_NAME &&
          !doc.PROV_NAME.match(/,/g)
        ) {
          const splitName = doc.PROV_NAME.split(" ");
          if (splitName && splitName.length > 1) {
            const lastName = splitName[splitName.length - 1];
            if (lastName.match(/^[a-z]+.*[a-z]+$/i)) {
              console.log("lastName", lastName);
              const otherNames = splitName;
              otherNames.splice(splitName.length - 1, 1);
              console.log("otherNames", otherNames);
              doc.formattedName = `${lastName}, ${otherNames.join(" ")}`;
            }
          }
        }

        doc.firstLetter = doc.formattedName
          ? doc.formattedName.substring(0, 1)
          : doc.PROV_NAME
          ? doc.PROV_NAME.substring(0, 1)
          : "";

        let inventory = doc.INVENTORY;
        let series = doc.SERIES;

        series = map(series, s => {
          return {
            ...pickBy(s, identity),
            SSUMNOTE: s.SSUMNOTE
              ? "<p>" +
                s.SSUMNOTE.replace(/\n{2,}/g, "</p><p>").replace(
                  /\n/g,
                  "<br>"
                ) +
                "</p>"
              : "",
            slug: `/collection/archives/provenances/series/${slugify(
              s.SERIES_ID.replace(/\//, "-"),
              { lower: true }
            )}`,
            slugifiedId: slugify(s.SERIES_ID.replace(/\//, "-"), {
              lower: true
            }),
            slugifiedProvId: slugify(s.PROV_ID.replace(/\//, "-"), {
              lower: true
            })
          };
        });

        inventory = map(inventory, i => {
          return {
            ...i,
            _id: slugify(i.CONTROL.replace(/\//, "-"), {
              lower: true
            }),
            TITLEDET: i.TITLEDET
              ? "<p>" +
                i.TITLEDET.replace(/\n{2,}/g, "</p><p>").replace(
                  /\n/g,
                  "<br>"
                ) +
                "</p>"
              : "",
            slug: `/collection/archives/provenances/series/items/${slugify(
              i.CONTROL.replace(/\//, "-"),
              {
                lower: true
              }
            )}`,
            // slugifiedId: slugify(i.CONTROL.replace(/\//, "-"), {
            //   lower: true
            // }),
            slugifiedSeriesId: slugify(i.SERIES_ID.replace(/\//, "-"), {
              lower: true
            }),
            slugifiedProvId: slugify(i.PROV_ID.replace(/\//, "-"), {
              lower: true
            })
          };
        });

        doc.INVENTORY = map(doc.INVENTORY, i => {
          return slugify(i.CONTROL.replace(/\//, "-"), {
            lower: true
          });
        });

        doc.SERIES = map(doc.SERIES, i => {
          return i.SERIES_ID;
        });

        const inventoryOps = map(inventory, i => {
          return {
            updateOne: {
              filter: { _id: i._id },
              update: {
                $set: { ...pickBy(i, identity) }
              },
              upsert: true
            }
          };
        });

        const seriesOps = map(series, s => {
          return {
            updateOne: {
              filter: { _id: s.SERIES_ID },
              update: {
                $set: { ...pickBy(s, identity) }
              },
              upsert: true
            }
          };
        });

        promiseChain = promiseChain.then(() =>
          db
            .collection("Archive_provenance")
            .insertOne(
              {
                ...pickBy(doc, identity)
              },
              {
                w: "majority",
                wtimeout: 10000,
                serializeFunctions: true
              }
              // function(err, r) {
              //   assert.equal(null, err);
              //   assert.equal(1, r.insertedCount);
              // }
            )
            .then(() => {
              if (!inventoryOps.length) return Promise.resolve();
              return db
                .collection("Archive_inventory")
                .bulkWrite(inventoryOps, { ordered: false })
                .then(() => {
                  if (!seriesOps.length) return Promise.resolve();
                  return db
                    .collection("Archive_series")
                    .bulkWrite(seriesOps, { ordered: false })
                    .catch(err => {
                      console.log("err", err);
                      throw new Error(err);
                    });
                })
                .catch(err => {
                  console.log("err", err);
                  throw new Error(err);
                });
            })
        );
      });

      return promiseChain.then(() => {
        client.close();
      });
    })
    .catch(err => {
      console.log(err);
    });
});

function readCsv(filePath) {
  return csv()
    .fromFile(filePath)
    .then(function(jsonArrayObj) {
      //when parse finished, result will be emitted here.
      //console.log(jsonArrayObj);
      return jsonArrayObj;
    })
    .catch(err => {
      console.log(filePath + " " + err);
    });
}

function readAndExecute(folder) {
  const masterJson = {
    legacy: {}
  };
  var promises = [];
  var fileArray = getCsvFiles(MIGRATION_DIR + folder);
  forEach(fileArray, fileName => {
    //console.log("HEELL");
    promises.push(readCsv(MIGRATION_DIR + folder + "/" + fileName));
  });
  return Promise.all(promises).then(results => {
    forEach(fileArray, (fileName, $index) => {
      fileName = fileName.toUpperCase().substr(0, fileName.length - 4);
      if (!MAIN_FILES.includes(fileName)) {
        masterJson["legacy"][fileName] = results[$index];
      } else {
        if (fileName === "PROVENANCE" && results[$index][0] != null) {
          masterJson["PROV_ID"] = results[$index][0]["PROV_ID"];
          masterJson["PROV_NAME"] = results[$index][0]["N"];
          masterJson["TYPE"] = results[$index][0]["PTYPE"];
        }
        masterJson[fileName] = results[$index];
      }
    });
    return masterJson;
  });
}
