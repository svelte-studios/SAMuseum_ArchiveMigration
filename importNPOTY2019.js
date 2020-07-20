const { forEach, omit, startCase, toLower } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/NPOTY 2019/"; //process.cwd() + "/mongo/archiveMigration/"
const { readFile, readdirSync, existsSync } = require("fs");
const excelToJson = require("convert-excel-to-json");
const awsSDK = require("aws-sdk");
require("dotenv").config();

const formatStartCase = string => {
  return startCase(toLower(string));
};

const S3_BUCKET_NAME = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "ap-southeast-2";

awsSDK.config.update({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

const s3 = new awsSDK.S3();

const sourceFile = MIGRATION_DIR + "2019 NPOTY data.xlsx";

const uploadImage = function(fileBuffer, id) {
  const uploadImagePromise = new Promise((resolve, reject) => {
    s3.putObject(
      {
        Bucket: S3_BUCKET_NAME,
        Key: id,
        Body: fileBuffer,
        ACL: "public-read",
        ContentEncoding: "base64"
      },
      (err, result) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

  return uploadImagePromise.then(result => {
    return result;
  });
};

function exportImage(db, entry) {
  const pathToFile =
    entry.award && entry.award.match(/PORTFOLIO/gi)
      ? `${MIGRATION_DIR}Small watermarked/Portfolio watermarked/${entry.fileName}`
      : entry.award && entry.award.match(/OVERALL WINNER/gi)
      ? `${MIGRATION_DIR}Small watermarked/OW watermarked/${entry.fileName}`
      : `${MIGRATION_DIR}Small watermarked/${entry.category} watermarked/${entry.fileName}`;

  entry.portfolioPrize =
    entry.award && entry.award.match(/PORTFOLIO/gi) ? true : false;

  if (
    entry.award &&
    (entry.award.match(/PORTFOLIO/gi) || entry.award.match(/OVERALL WINNER/gi))
  )
    delete entry.award;

  const imagePath = `competition/NPOTY/2019/${entry.category}/small/${entry.fileName}`;

  return readFile(pathToFile, (err, image) => {
    // uploadImage(image, `images/${imagePath}`).then(() => {
    return db.collection("competitionEntries").updateOne(
      { _id: `${entry.category}_${entry.title}` },
      {
        $set: {
          ...entry,
          path: imagePath,
          competitionId: "NPOTY",
          iterationId: "2019"
        }
      },
      { upsert: true }
    );
    // });
  });
}

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  const jsonObj = excelToJson(csvConfig);

  let promiseChain = Promise.resolve();

  forEach(jsonObj, (entries, category) => {
    forEach(entries, entry => {
      entry = setCategory(entry);
      promiseChain = promiseChain.then(() => {
        return exportImage(db, entry);
      });
    });
  });

  const awardsData = excelToJson(awardsConfig);
  forEach(awardsData.Portfolio, entry => {
    entry = setCategory(entry);
    promiseChain = promiseChain.then(() => {
      return db.collection("competitionEntries").updateOne(
        { _id: `${entry.category}_${entry.title}` },
        {
          $set: {
            award: "",
            judgesComments: awardsData.Portfolio[0].judgesComments
          }
        },
        { upsert: true }
      );
    });
  });

  promiseChain = promiseChain.then(() => {
    let overallWinner = awardsData.Overall[0];
    overallWinner.award = "OVERALL WINNER";
    overallWinner = setCategory(overallWinner);
    exportImage(db, overallWinner);
    return db.collection("competitionEntries").updateOne(
      { _id: `${overallWinner.category}_${overallWinner.title}` },
      {
        $set: {
          award: "OVERALL WINNER",
          judgesComments: overallWinner.judgesComments
        }
      },
      { upsert: true }
    );
  });

  return promiseChain.then(() => {
    // client.close();
  });
});

function setCategory(entry) {
  if (entry.award && entry.award.match(/OVERALL WINNER/gi))
    entry.category = "Animal Behaviour";
  entry.category = entry.category.replace(/(\(.*\))/gi, "");
  entry.category = formatStartCase(entry.category);

  return entry;
}

const awardsConfig = {
  sourceFile,
  header: {
    rows: 1
  },
  sheets: [
    {
      name: "Overall",
      columnToKey: {
        // A: "award",
        // B: "title"
        A: "category",
        B: "title",
        C: "species",
        D: "status",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Portfolio",
      columnToKey: {
        A: "category",
        B: "title",
        C: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    }
  ]
};

const csvConfig = {
  sourceFile,
  header: {
    rows: 1
  },
  sheets: [
    {
      name: "Portrait",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Behaviour",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Habitat",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Botanical",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Landscape",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "photographer",
        E: "description",
        F: "location",
        G: "capturedWith",
        H: "judgesComments",
        I: "fileName"
      }
    },
    {
      name: "Monochrome",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Junior",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "age",
        G: "description",
        H: "location",
        I: "capturedWith",
        J: "judgesComments",
        K: "fileName",
        L: "photographerPortraitFile"
      }
    },
    {
      name: "Our Impact",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "photographer",
        F: "description",
        G: "location",
        H: "capturedWith",
        I: "judgesComments",
        J: "fileName"
      }
    },
    {
      name: "Threatened",
      columnToKey: {
        A: "award",
        B: "category",
        C: "title",
        D: "species",
        E: "status",
        F: "photographer",
        G: "description",
        H: "location",
        I: "capturedWith",
        J: "judgesComments",
        K: "fileName"
      }
    }
  ]
};
