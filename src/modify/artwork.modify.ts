import { ObjectId } from "mongodb";
import * as DbUtil from "../db";
import { Artwork } from "../model/artwork";

async function main() {
  const collections = await DbUtil.connect();
  const chunkSize = 10_0000;
  let _id = new ObjectId(new Array(24).fill(0).join(""));
  let artworks: Artwork[];
  do {
    let now = Date.now();
    artworks = (await collections.artwork
      .find(
        {
          _id: { $gt: _id },
          is_r18: false,
        },
        {
          projection: {
            _id: 1,
            id: 1,
            tags: 1,
          },
          limit: chunkSize,
        }
      )
      .toArray()) as Artwork[];
    console.log(
      `${artworks[0]._id}~${artworks[artworks.length - 1]}, chunkSize: ${
        artworks.length
      }, 耗时${(Date.now() - now) / 1000}s`
    );

    const tmp: number[] = [];
    for (const artwork of artworks) {
      if (artwork.tags.some((tag) => tag === "R-18G")) tmp.push(artwork.id);
    }
    console.log(`以下doc需要更新: ${tmp.join()}`);
    now = Date.now();
    await collections.artwork
      .updateMany(
        {
          _id: { $gt: _id },
          id: { $in: tmp },
        },
        {
          $set: { is_r18: true },
        }
      )
      .then((opResult) => {
        console.log(
          `更新${opResult.result.nModified}条doc, 耗时${
            (Date.now() - now) / 1000
          }s`
        );
      });

    _id = artworks[artworks.length - 1]._id;
  } while (artworks.length === chunkSize);
  console.log(`${new Date().toUTCString()} 更新完毕`);
  process.exit(0);
}
main();
