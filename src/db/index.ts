import { MongoClient } from "mongodb";

const DB_URL = "mongodb://admin:hehenimab@144.168.57.6:27017/?authSource=admin";
const DB_NAME = "pixiv";

export async function connect() {
  const client = await MongoClient.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db(DB_NAME);
  return {
    artwork: db.collection("artwork"),
    tag: db.collection("tag"),
    user: db.collection("user"),
  };
}