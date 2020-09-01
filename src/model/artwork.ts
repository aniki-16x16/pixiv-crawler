import { _MongoData, _Response } from "./base";

export interface ArtworkPost {
  id: number;
  date: Date;
}

export interface Artwork extends _MongoData {
  id: number;
  author: number;
  title: string;
  desc: string;
  pages: number;
  is_r18: boolean;
  tags: string[];
  view_info: {
    likes: number;
    marks: number;
    views: number;
  };
  post_date: Date;
  additional: {
    last_update: Date;
  };
}

export interface ArtworkResponse extends _Response {
  body: {
    illustId: string;
    userId: string;
    bookmarkCount: number;
    likeCount: number;
    viewCount: number;
    createDate: string;
    uploadDate: string;
    illustTitle: string;
    description: string;
    pageCount: number;
    tags: {
      tags: {
        tag: string;
        translation?: {
          en: string; // 中文翻译
        };
      }[];
    };
  };
}
