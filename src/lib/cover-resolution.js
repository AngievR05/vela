import {loadReaderBook} from "./reader-library.js";
import {findImportMetadata,importWorkTitle,sameImportWork} from "./library-import.js";
import {googleCoverUrl} from "./book-cover-url.js";

export function createCoverResolver({isbnCover,search,lookup,findIsbns,now=Date.now,maxEntries=500}) {
  const cache=new Map();
  return async book=>{
    const existing=googleCoverUrl(book.coverSrc);if(existing)return existing;
    const key=JSON.stringify([book.googleBooksId,book.isbn,book.title,book.author]);
    const saved=cache.get(key);if(saved&&saved.until>now())return saved.promise;
    const entry={until:now()+60000};
    entry.promise=(async()=>{
      let unavailable=false;
      if(book.isbn)try{const cover=googleCoverUrl(await isbnCover(book.isbn));if(cover)return cover;}catch{unavailable=true;}
      if(book.googleBooksId&&!book.googleBooksId.startsWith("manual:"))try{const full=await lookup(book.googleBooksId);const cover=full?.googleBooksId===book.googleBooksId&&googleCoverUrl(full.thumbnailUrl);if(cover)return cover;}catch{unavailable=true;}
      const row={title:book.title,author:book.author,isbn:book.isbn||""};
      try {
        const exact=await findImportMetadata(row,search),cover=googleCoverUrl(exact?.thumbnailUrl);if(cover)return cover;
        // A verified same-work cover can differ by edition, without replacing CSV facts.
        if(row.isbn){const results=await search(`intitle:"${importWorkTitle(row.title).replaceAll('"',"")}" inauthor:"${row.author.replaceAll('"',"")}"`,10);const cover=googleCoverUrl(results.find(item=>sameImportWork(row,item)&&googleCoverUrl(item.thumbnailUrl))?.thumbnailUrl);if(cover)return cover;}
      }catch{unavailable=true;}
      if(findIsbns)try{for(const isbn of await findIsbns(row)){const cover=googleCoverUrl(await isbnCover(isbn));if(cover)return cover;}}catch{unavailable=true;}
      if(unavailable)throw new Error("Book covers temporarily unavailable");
      return null;
    })().then(cover=>{entry.until=now()+(cover?3600000:60000);return cover;});
    cache.set(key,entry);while(cache.size>maxEntries)cache.delete(cache.keys().next().value);
    return entry.promise;
  };
}
export async function readerCover(supabase,userId,id,resolve) {
  const book=await loadReaderBook(supabase,userId,id);
  if(!book||book.isRemoved)return null;
  return resolve(book);
}
