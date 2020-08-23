import { _MongoData } from "./base";
import { ArtworkPost } from "./artwork";

export interface Tag extends _MongoData {
  name: string;
  translation?: string;
  total_post: number;
  additional: {
    last_update: Date;
    last_post: ArtworkPost;
  };
}
