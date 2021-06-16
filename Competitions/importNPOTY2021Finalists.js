const { forEach, map, shuffle } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/Competitions/2021 NPOTY Finalists/"; //process.cwd() + "/mongo/archiveMigration/"
const { readFile } = require("fs");
const excelToJson = require("convert-excel-to-json");
const awsSDK = require("aws-sdk");
require("dotenv").config();

const S3_BUCKET_NAME = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "ap-southeast-2";

awsSDK.config.update({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const s3 = new awsSDK.S3();

const sourceFile = MIGRATION_DIR + "spreadsheet.xlsx";

const uploadImage = function (fileBuffer, id) {
  const uploadImagePromise = new Promise((resolve, reject) => {
    s3.putObject(
      {
        Bucket: S3_BUCKET_NAME,
        Key: id,
        Body: fileBuffer,
        ACL: "public-read",
        ContentEncoding: "base64",
      },
      (err, result) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

  return uploadImagePromise.then((result) => {
    return result;
  });
};

function saveFinalistAndUploadImage(db, finalist) {
  const pathToFile = `${MIGRATION_DIR}${finalist.category}/${finalist.fileName}`;

  const imagePath = `competition/NPOTY/2021/${finalist.category}/${finalist._id}`;

  const finalistData = {
    ...finalist,
    photographer: `${finalist.firstName} ${finalist.lastName}, ${finalist.photographersLocation}`,
    lens: finalist.cameraDetails,
    path: imagePath,
    awardCategories: [finalist.category],
    competitionId: "NPOTY",
    iterationId: "2021",
  };

  readFile(pathToFile, (err, image) => {
    // uploadImage(image, `images/${imagePath}`).then(() => {
    return db
      .collection("competitionEntries")
      .updateOne(
        { _id: finalist._id },
        {
          $set: finalistData,
        },
        { upsert: true }
      )
      .then(() => console.log(`Saved ${finalist._id} (${finalist.title})`));
    // });
  });
}

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function (err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  const jsonObj = excelToJson(csvConfig);

  let promiseChain = Promise.resolve();

  forEach(jsonObj, (finalists, category) => {
    const testFinalist = finalists[0];
    testFinalist.category = category;
    // promiseChain = promiseChain.then(() => {
    //   saveFinalistAndUploadImage(db, testFinalist);
    // });
    forEach(finalists, (finalist) => {
      finalist.category = category;
      promiseChain = promiseChain.then(() => {
        saveFinalistAndUploadImage(db, finalist);
      });
    });
  });

  //   return db
  //     .collection("competitionEntries")
  //     .deleteMany({ competitionId: "NPOTY", iterationId: "2021" })
  //     .then(() => {
  return promiseChain.then(() => {
    // return db
    //   .collection("competitionEntries")
    //   .find({ competitionId: "NPOTY", iterationId: "2021" })
    //   .toArray()
    //   .then((entries) => {
    //     entries = shuffle(entries);
    //     const ops = map(entries, (e) => {
    //       return {
    //         updateOne: {
    //           filter: { _id: e._id },
    //           update: { $set: e },
    //           upsert: true,
    //         },
    //       };
    //     });
    //     return db
    //       .collection("competitionEntries")
    //       .deleteMany({ competitionId: "NPOTY", iterationId: "2021" })
    //       .then(() => {
    //         return db
    //           .collection("competitionEntries")
    //           .bulkWrite(ops, { ordered: true });
    //       });
    //   });
    // client.close();
  });
  // });
});

const csvConfig = {
  sourceFile,
  header: {
    rows: 1,
  },
  sheets: [
    {
      name: "Botanical",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
    {
      name: "Junior",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "age",
        G: "title",
        H: "description",
        I: "location",
        J: "cameraDetails",
        K: "species",
      },
    },
    {
      name: "Animal Habitat",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
    {
      name: "Threatened Species",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
        K: "iucnStatus",
      },
    },
    {
      name: "Animal Portrait",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
    {
      name: "Landscape",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
    {
      name: "Monochrome",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
    {
      name: "Our Impact",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
    {
      name: "Animal Behaviour",
      columnToKey: {
        A: "fileName",
        B: "_id",
        C: "firstName",
        D: "lastName",
        E: "photographersLocation",
        F: "title",
        G: "description",
        H: "location",
        I: "cameraDetails",
        J: "species",
      },
    },
  ],
};
