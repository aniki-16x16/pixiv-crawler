import Axios, { AxiosError } from "axios";
import { ArtworkResponse, Artwork } from "./model/artwork";
import { Tag } from "./model/tag";
import { Concurrent } from "./utils";
import * as DbUtil from "./db";

const USER_URL = "https://www.pixiv.net/ajax/user/$$i?full=1&lang=zh";
const ILLUST_URL = "https://www.pixiv.net/ajax/illust/$$i?lang=zh";
const ILLUST_PAGE_URL = "https://www.pixiv.net/ajax/illust/$$i/pages?lang=zh";
const getUrl = (url: string, val: number) => url.replace("$$i", val.toString());

async function main() {
  let collections = await DbUtil.connect();

  let task = new Concurrent(
    function* () {
      let count = 1;
      while (true) {
        yield count++;
      }
    },
    (illustId: number) => Axios.get(getUrl(ILLUST_URL, illustId)),
    20,
    1000,
    false
  );
  task.setPipeline({
    onChunkFullfilled: async (chunk: _ArtworkBeforeWrite[]) => {
      const now = new Date();
      chunk.sort(
        (a: _ArtworkBeforeWrite, b: _ArtworkBeforeWrite) => a.id - b.id
      );

      // tags数组包含了所有artwork中的所有tag
      const tags: Tag[] = [];
      const tagTemp = {};
      for (const artwork of chunk) {
        ((artwork as unknown) as Artwork).tags = artwork.tags.map((tag) => {
          if (tagTemp[tag.name]) {
            let tmp = tags[tagTemp[tag.name]];
            tmp.total_post += 1;
            tmp.additional = {
              last_update: now,
              last_post: {
                id: artwork.id,
                date: artwork.post_date,
              },
            };
          } else {
            tags.push({
              name: tag.name,
              translation: tag.translation,
              total_post: 1,
              additional: {
                last_update: now,
                last_post: {
                  id: artwork.id,
                  date: artwork.post_date,
                },
              },
            });
            tagTemp[tag.name] = tags.length - 1;
          }

          return tag.name;
        });
      }

      const _prom1 = collections.artwork
        .insertMany((chunk as unknown) as Artwork[])
        .then(() => {
          console.log(
            `${new Date().toUTCString()} 成功写入${chunk.length}条artwork`
          );
        });
      const _prom2 = collections.tag.insertMany(tags).then(() => {
        console.log(`${new Date().toUTCString()} 成功写入${tags.length}条tag`);
      });
      await Promise.all([_prom1, _prom2]);
    },
    success(res) {
      if ((res.data as ArtworkResponse).error) throw new Error();

      let now = new Date();
      let data = (res.data as ArtworkResponse).body;
      let artwork: _ArtworkBeforeWrite = {
        id: Number.parseInt(data.illustId),
        author: Number.parseInt(data.userId),
        title: data.illustTitle,
        desc: data.description,
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
      return artwork;
    },
    error(err: AxiosError, illustId: number) {
      let now = new Date().toUTCString();
      if (err.response?.status === 404) {
        console.error(`${now} illust-${illustId}不存在`);
      } else {
        console.error(`${now} illust-${illustId}发生未知错误，以下是错误信息:`);
        console.error(err);
        process.exit(1);
      }
    },
  });
  task.start();
}
main();

interface _ArtworkBeforeWrite extends Omit<Artwork, "tags"> {
  tags: {
    name: string;
    translation?: string;
  }[];
}
