import { _MongoData, _Response } from "./base";
import { ArtworkPost } from "./artwork";

export interface User extends _MongoData {
  id: number;
  nickname: string;
  total_post: number;
  avatar: string;
  artworks: ArtworkPost[];
  additional: {
    last_update: Date;
    last_post: ArtworkPost;
  };
}

export interface UserResponse extends _Response {
  body: {
    userId: string; // 用户ID，需要转换成number
    name: string;
    imageBig: string; // 头像
    comment: string; // 个人简介
  };
}

export interface UserStatistic extends _MongoData {
  id: number;
  popularity: number;
  post_frequency: number;
  liked_tags: {
    name: string;
    post_history: ArtworkPost[];
  }[];
}
