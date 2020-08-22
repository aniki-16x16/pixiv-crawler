import { ObjectId } from "mongodb";

export interface _MongoData {
  _id?: ObjectId;
}

export interface _Response {
  error: boolean;
  message: string;
}
