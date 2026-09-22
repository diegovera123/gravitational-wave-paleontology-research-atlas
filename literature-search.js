/* Live metadata lookup. Search results are NOT a curated or verified bibliography. */
(function(root){
"use strict";
const esc=value=>String(value??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
const PAGE_SIZE=20,MAX=1000;
function queryFor(concept){
 const title=String(concept?.title||"gravitational wave paleontology").trim().slice(0,110);
 // Also supports broad scientific context for techniques shared with other disciplines.
 return title+" gravitational wave astrophysics";
}
function buildUrl(concept,page=1){
 if(!Number.isInteger(page)||page<1||page>50)throw Error("Page outside the 1,000-result limit");
 const url=new URL("https://api.openalex.org/works");
 url.searchParams.set("search",queryFor(concept));
 url.searchParams.set("page",String(page));
 url.searchParams.set("per_page",String(PAGE_SIZE));
 url.searchParams.set("select","id,title,doi,publication_year,primary_location,authorships");
 return url.href;
}
function safeUrl(input){
 try{const u=new URL(input);return ["https:","http:"].includes(u.protocol)?u.href:null;}
 catch{return null;}
}
function normalize(result){
 const title=String(result?.title||"").trim();
 const destination=safeUrl(result?.doi)||safeUrl(result?.primary_location?.landing_page_url)||safeUrl(result?.id);
 if(!title||!destination)return null;
 const authors=(result.authorships||[]).slice(0,3).map(a=>a.author?.display_name).filter(Boolean).join(", ");
 return {title,url:destination,year:Number.isInteger(result.publication_year)?result.publication_year:null,authors};
}
function mount({host,concept,request=fetch}){
 if(!host||!concept)return null;
 let page=0,epoch=0,opened=false;
 const fallback="https://openalex.org/works?search="+encodeURIComponent(queryFor(concept));
 host.innerHTML='<p class="literature-disclaimer">Discover related scholarly records live through OpenAlex. Up to 1,000 search hits are browsable in pages of 20 when the API has enough matches. Results are machine-retrieved, may be off-topic or unreviewed, and are not Atlas-curated references.</p>'+
   '<button type="button" data-literature-open class="constellation-quiet">Search related research papers ↗</button>'+
   '<div data-literature-status role="status" aria-live="polite"></div>'+
   '<div data-literature-list class="literature-list"></div>'+
   '<div data-literature-controls class="literature-controls"></div>';
 const status=host.querySelector("[data-literature-status]"),list=host.querySelector("[data-literature-list]"),
  controls=host.querySelector("[data-literature-controls]");
 async function load(nextPage){
  if(nextPage<1||nextPage>50)return;
  const ticket=++epoch;
  status.textContent="Retrieving page "+nextPage+" of related scholarly metadata…";
  controls.replaceChildren();list.replaceChildren();
  try{
   const response=await request(buildUrl(concept,nextPage));
   if(!response.ok)throw Error("Research index returned HTTP "+response.status);
   const data=await response.json();if(ticket!==epoch)return;
   const hits=(Array.isArray(data.results)?data.results:[]).map(normalize).filter(Boolean);
   page=nextPage;opened=true;
   const reported=Number.isFinite(data.meta?.count)?Math.min(MAX,data.meta.count):MAX;
   status.textContent=hits.length?("Search page "+page+" · "+hits.length+" scholarly records displayed · "+
    "up to "+reported+" search hits available under this browser's 1,000-result limit."):"No records returned for this page. Try a broader search.";
   if(!hits.length){
    const a=document.createElement("a");a.href=fallback;a.target="_blank";a.rel="noopener noreferrer";
    a.textContent="Search the scholarly index directly ↗";list.appendChild(a);
   }
   for(const paper of hits){
    const article=document.createElement("article"),a=document.createElement("a"),meta=document.createElement("p");
    a.href=paper.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=paper.title+" ↗";
    meta.textContent=[paper.authors,paper.year].filter(Boolean).join(" · ") || "Metadata only";
    article.appendChild(a);article.appendChild(meta);list.appendChild(article);
   }
   const nav=document.createElement("div");nav.className="literature-page-nav";
   const prev=document.createElement("button");prev.type="button";prev.textContent="← Previous 20";prev.disabled=page===1;
   prev.addEventListener("click",()=>load(page-1));
   const next=document.createElement("button");next.type="button";next.textContent="Next 20 →";
   next.disabled=!hits.length||page>=50||(Number.isFinite(data.meta?.count)&&page*PAGE_SIZE>=data.meta.count);
   next.addEventListener("click",()=>load(page+1));nav.appendChild(prev);nav.appendChild(next);controls.appendChild(nav);
  }catch(error){
   if(ticket!==epoch)return;
   status.textContent="The live literature index is unavailable or rate-limited. No papers have been added to the curated list.";
   const a=document.createElement("a");a.href=fallback;a.target="_blank";a.rel="noopener noreferrer";
   a.textContent="Try searching OpenAlex directly ↗";controls.replaceChildren(a);
  }
 }
 host.querySelector("[data-literature-open]").addEventListener("click",()=>load(opened?page:1));
 return {load,query:queryFor(concept)};
}
root.AtlasLiterature={PAGE_SIZE,MAX,queryFor,buildUrl,normalize,mount};
})(typeof window!=="undefined"?window:globalThis);
