import Axios, { AxiosError } from "axios";
import { MongoClient } from "mongodb";
import { concurrent } from "./utils";
import { ArtworkResponse, Artwork } from "./model/artwork";

const USER_URL = "https://www.pixiv.net/ajax/user/$$i?full=1&lang=zh";
const ILLUST_URL = "https://www.pixiv.net/ajax/illust/$$i?lang=zh";
const ILLUST_PAGE_URL = "https://www.pixiv.net/ajax/illust/$$i/pages?lang=zh";
const getUrl = (url: string, val: number) => url.replace("$$i", val.toString());

const DB_URL = "mongodb://admin:hehenimab@144.168.57.6:27017/?authSource=admin";
const DB_NAME = "pixiv";
async function main() {
  const client = await MongoClient.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db(DB_NAME);
  const collections = {
    artwork: db.collection("artwork"),
    tag: db.collection("tag"),
    user: db.collection("user"),
  };

  concurrent(
    function* () {
      let count = 0;
      while (true) {
        yield count++;
      }
    },
    (illustId: number) => {
      return Axios.get(getUrl(ILLUST_URL, illustId))
        .then(async (res) => {
          if ((res.data as ArtworkResponse).error) throw new Error();

          let now = new Date();
          let data = (res.data as ArtworkResponse).body;
          let artwork: Artwork = {
            id: Number.parseInt(data.illustId),
            title: data.illustTitle,
            desc: data.description,
            src: [],
            pages: data.pageCount,
            tags: data.tags.tags.map((tag) => ({
              name: tag.tag,
              translation: tag.translation?.en ?? "",
            })),
            is_r18: data.tags.tags.some((tag) => tag.tag === "R-18"),
            post_date: new Date(data.uploadDate),
            view_info: {
              marks: data.bookmarkCount,
              likes: data.likeCount,
              views: data.viewCount,
            },
            additional: {
              last_update: now,
            },
          };

          await collections.artwork.insertOne(artwork);
          console.log(`${now} illust-${illustId}保存成功`);
        })
        .catch((err: AxiosError) => {
          let now = new Date().toUTCString();
          if (err.response?.status === 404) {
            console.log(`ERROR! ${now}! illust-${illustId}不存在`);
          } else {
            console.log(`ERROR! ${now} illust-${illustId}发生未知错误`);
          }
        });
    },
    20
  );
}
main();
