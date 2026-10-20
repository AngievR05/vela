import {sameImportWork,importWorkTitle} from "./library-import.js";
import {validIsbn} from "./library-data.js";
import {createQuotaGuard} from "./provider-policy.js";

// Missing ISBNs are resolved from public bibliographic facts only. Covers still come from Google.
export function createIsbnCatalogue({fetcher=fetch,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  let next=0;const quota=createQuotaGuard({now});
  return async book=>{
    quota.check();const slot=Math.max(next,now());if(slot-now()>15000)throw new Error("Cover matching is busy; retry later");next=slot+1100;
    if(slot>now())await wait(slot-now());quota.check();
    const url=new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title",importWorkTitle(book.title));url.searchParams.set("author",book.author);
    url.searchParams.set("fields","title,author_name,isbn");url.searchParams.set("limit","5");
    const response=await fetcher(url,{headers:{"User-Agent":"Vela/0.1 (reading companion; cover ISBN matching)",Accept:"application/json"},signal:AbortSignal.timeout(10000),next:{revalidate:3600}});
    quota.observe(response.status);if(!response.ok)throw new Error("ISBN catalogue unavailable");
    const data=await response.json();
    return [...new Set((Array.isArray(data.docs)?data.docs:[]).filter(item=>typeof item.title==="string"&&Array.isArray(item.author_name)&&item.author_name.every(name=>typeof name==="string")&&sameImportWork(book,{title:item.title,authors:item.author_name})).flatMap(item=>Array.isArray(item.isbn)?item.isbn:[]).filter(value=>typeof value==="string"&&validIsbn(value)))].slice(0,3);
  };
}
