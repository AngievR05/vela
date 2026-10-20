export function googleCoverUrl(value) {
  if(typeof value!=="string")return null;
  try {
    const url=new URL(value.replace(/^http:/i,"https:"));
    if(url.protocol!=="https:"||url.username||url.password||url.port||!["books.google.com","books.googleusercontent.com"].includes(url.hostname)&&!/^bks\d+[.]books[.]google[.]com$/.test(url.hostname))return null;
    if(/^bks\d+[.]/.test(url.hostname))url.hostname="books.google.com";
    url.searchParams.delete("imgtk");
    if(url.searchParams.get("img")==="1"&&url.searchParams.get("zoom")==="5")url.searchParams.set("zoom","1");
    return url.href;
  }catch{return null;}
}
