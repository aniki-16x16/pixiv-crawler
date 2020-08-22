import { _MongoData, _Response } from "./base";

export interface ArtworkPost {
  id: number;
  date: Date;
}

export interface Artwork extends _MongoData {
  id: number;
  title: string;
  desc: string;
  src: string[];
  pages: number;
  is_r18: boolean;
  tags: {
    name: string;
    translation: string;
  }[];
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
    illustId: string; // 图片ID，需要转换成number
    bookmarkCount: number;
    likeCount: number;
    viewCount: number;
    createDate: string; // 字符串，需要转换成Date
    uploadDate: string; // 同理
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

export interface ArtworkPagesResponse extends _Response {
  body: {
    height: number;
    width: number;
    urls: {
      original: string;
    };
  }[];
}
