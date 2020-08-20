import { _MongoData } from "./base";
import { ArtworkPost } from "./artwork";

export interface Tag extends _MongoData {
  name: string;
  total_post: number;
  artworks: ArtworkPost[];
  additional: {
    last_update: Date;
    last_post: ArtworkPost;
  }
}

export interface TagStatistic extends _MongoData {
  name: string;
  popularity: number;
  post_frequency: number;
}