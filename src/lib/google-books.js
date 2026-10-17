import "server-only";
import {serverEnv} from "@/lib/env/server";
import {searchGoogleBooksRequest,getGoogleBookRequest} from "./google-books-request.js";

export function searchGoogleBooks(query,maxResults=10){
  return searchGoogleBooksRequest(query,maxResults,{apiKey:serverEnv.GOOGLE_BOOKS_API_KEY});
}
export function getGoogleBook(id){
  return getGoogleBookRequest(id,{apiKey:serverEnv.GOOGLE_BOOKS_API_KEY});
}
