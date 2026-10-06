"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DiscoverShell from "./DiscoverShell";
import BookCover from "@/components/books/BookCover";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InlineAlert from "@/components/ui/InlineAlert";
import { plainDescription } from "@/lib/library-data";
import { libraryBookSchema } from "@/lib/home-data";
import styles from "./Discover.module.css";
export default function CatalogueBookDetail({ book }) {
  const router=useRouter();const [pending,setPending]=useState(false);const [error,setError]=useState("");const busy=useRef(false);
  async function save(status){
    if(busy.current)return;busy.current=true;setPending(true);setError("");
    try{const response=await fetch("/api/library",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({googleBooksId:book.googleBooksId,status}),signal:AbortSignal.timeout(20000)});
      if(response.status===401){window.location.replace("/login?next=/discover");return;}
      const body=await response.json();if(!response.ok)throw new Error(body.error||"Save failed");const parsed=libraryBookSchema.safeParse(body.book);if(!parsed.success)throw new Error("Save confirmation unavailable");
      router.push(`/library/${parsed.data.id}`);
    }catch{setError("We couldn’t confirm the saved book. Your selection is still here; please try again.");}
    finally{busy.current=false;setPending(false);}
  }
  return <DiscoverShell title="Book detail" subtitle="Book facts · Google Books" onBack={()=>router.push("/discover")}><Card className={styles.hero}><BookCover title={book.title} author={book.authors.join(", ")} src={book.thumbnailUrl} size="detail" className={styles.heroCover} decorative/><div><h2>{book.title}</h2><p>{book.authors.join(", ")||"Author unavailable"}</p><small>{[book.categories[0],book.publishedDate?.slice(0,4),book.pageCount?`${book.pageCount} pages`:null].filter(Boolean).join(" · ")}</small></div></Card>
    <Card className={styles.facts}><h2>About the book</h2><p>{plainDescription(book.description)||"No description is available from Google Books."}</p>{book.isbns?.length>0&&<p>ISBN {book.isbns[0]}</p>}</Card>
    <Button className={styles.primary} onClick={()=>save("want_to_read")} loading={pending}>Save to TBR</Button><Button className={styles.primary} variant="secondary" onClick={()=>save("reading")} disabled={pending}>Start reading</Button>{error&&<InlineAlert type="error">{error}</InlineAlert>}
  </DiscoverShell>;
}
