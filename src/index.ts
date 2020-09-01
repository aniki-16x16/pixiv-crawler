import Axios, { AxiosError } from "axios";
import { ArtworkResponse, Artwork } from "./model/artwork";
import { Tag } from "./model/tag";
import { Concurrent, formatDate } from "./utils";
import * as DbUtil from "./db";

const USER_URL = "https://www.pixiv.net/ajax/user/$$i?full=1&lang=zh";
const ILLUST_URL = "https://www.pixiv.net/ajax/illust/$$i?lang=zh";
const ILLUST_PAGE_URL = "https://www.pixiv.net/ajax/illust/$$i/pages?lang=zh";
const getUrl = (url: string, val: number) => url.replace("$$i", val.toString());

async function main() {
  let collections = await DbUtil.connect();
  new Concurrent(
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
  )
    .setPipeline({
      onChunkFullfilled: async (chunk: _ArtworkBeforeWrite[]) => {
        chunk.sort(
          (a: _ArtworkBeforeWrite, b: _ArtworkBeforeWrite) => a.id - b.id
        );

        /**
         * 在内存中维护一个Set，从而避免高并发时重复创建tag的问题
         * 不创建为全局变量，防止set变的过大
         */
        const createdTag = new Set<string>();
        const tags = _generateTagsByArtworks((chunk as unknown) as Artwork[]);
        const _updateTagsPromises: Promise<any>[] = [];
        const tagTimer = Date.now();
        for (const tag of tags) {
          _updateTagsPromises.push(
            collections.tag
              .findOneAndUpdate(
                { name: tag.name },
                {
                  $inc: { total_post: tag.total_post },
                  $push: { post_history: { $each: tag.post_history } },
                  $set: { additional: tag.additional },
                }
              )
              .then(
                (opResult): Promise<any> => {
                  if (!opResult.value) {
                    /**
                     * 第一次update的时候失败，可能是因为对应的tag没有创建
                     * 但是执行到这一步的中间时段，可能这个tag被创建了
                     * 所以这里通过内存中的Set去进行判断
                     * 如果已经创建，就再执行一次update，这样就避免了重复创建同一个tag
                     */
                    if (createdTag.has(tag.name)) {
                      return collections.tag.findOneAndUpdate(
                        { name: tag.name },
                        {
                          $inc: { total_post: tag.total_post },
                          $push: { post_history: { $each: tag.post_history } },
                          $set: { additional: tag.additional },
                        }
                      );
                    } else {
                      createdTag.add(tag.name);
                      return collections.tag.insertOne(tag);
                    }
                  }
                }
              )
          );
        }
        Promise.all(_updateTagsPromises)
          .then(() => {
            /**
             * 手动释放内存(效果存疑)
             */
            _updateTagsPromises.length = 0;
            console.log(
              `${formatDate(new Date())} ${tags.length}条tag耗时${
                (Date.now() - tagTimer) / 1000
              }秒`
            );
            console.log(process.memoryUsage());
          })
          .catch((err) => {
            console.error(`${formatDate(new Date())}操作tag时发生未知错误:`);
            console.error(err);
            process.exit(1);
          });

        await collections.artwork
          .insertMany((chunk as unknown) as Artwork[])
          .then(() => {
            console.log(
              `${formatDate(new Date())} 插入${chunk.length}条artwork`
            );
          });
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
          is_r18: data.tags.tags.some(
            (tag) => tag.tag === "R-18" || tag.tag === "R-18G"
          ),
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
      error(err: AxiosError, illustId: number, duration) {
        let now = formatDate(new Date());
        if (err.response?.status === 404) {
          if (duration < 1) console.log(`${now} ${illustId}不存在`);
        } else {
          console.error(`${now} ${illustId}未知错误:`);
          console.error(err);
          process.exit(1);
        }
      },
    })
    .start();
}
main();

interface _ArtworkBeforeWrite extends Omit<Artwork, "tags"> {
  tags: {
    name: string;
    translation?: string;
  }[];
}

function _generateTagsByArtworks(artworks: Artwork[]): Tag[] {
  const tags: Tag[] = [];
  const tagTemp = {};
  const now = new Date();
  for (const artwork of artworks) {
    artwork.tags = ((artwork as unknown) as _ArtworkBeforeWrite).tags.map(
      (tag) => {
        if (tagTemp[tag.name]) {
          let tmp = tags[tagTemp[tag.name]];
          tmp.total_post += 1;
          tmp.post_history.push(artwork.id);
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
            post_history: [artwork.id],
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
      }
    );
  }
  return tags;
}
