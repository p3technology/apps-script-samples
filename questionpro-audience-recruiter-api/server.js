import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://questionpro-audience-recruiter.onrender.com";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

app.use(cors({ origin: [ALLOWED_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5500"], methods:["GET","POST"] }));
app.use(express.json({ limit: "2mb" }));

const buckets = new Map();
function rateLimit(req,res,next){
  const key=req.ip || req.socket?.remoteAddress || "unknown";
  const now=Date.now(); const rec=buckets.get(key)||{start:now,count:0};
  if(now-rec.start>60_000){rec.start=now;rec.count=0}
  rec.count++; buckets.set(key,rec);
  if(rec.count>20) return res.status(429).json({error:"rate_limited"});
  next();
}
function auth(req,res,next){
  if(!ADMIN_TOKEN) return res.status(503).json({error:"admin_token_not_configured"});
  if(req.get("x-admin-token")!==ADMIN_TOKEN) return res.status(401).json({error:"unauthorized"});
  next();
}
app.use(rateLimit);

const groupGuidance={
  general_population:"Broad adult representation; local language, urban/rural balance, age and income mix.",
  rural:"Use local media, agricultural/community organizations, SMS/mobile-first channels, cooperatives and regional associations.",
  lower_income_mobile_first:"Use low-data mobile channels, community media, NGOs, referral programs and trusted local organizations. Avoid stigmatizing language.",
  youth:"Use youth organizations, education networks, creator-led media and approved social campaigns. Apply age/consent rules.",
  seniors:"Use senior organizations, community centers, health/wellness newsletters, postal/offline support where useful and caregiver referrals.",
  caregivers:"Use patient/caregiver organizations, condition communities, nonprofits and healthcare-adjacent partners. Avoid implying diagnosis in ad targeting.",
  disability:"Use disability-led organizations, accessibility communities, independent living groups and advocacy partners. Use accessible creative and forms.",
  healthcare_professionals:"Use professional associations, specialty newsletters, education providers, conferences and verified professional networks.",
  trades:"Use trade associations, supplier/distributor newsletters, vocational schools, unions where appropriate and professional communities.",
  small_business:"Use chambers, merchant groups, vertical SaaS ecosystems, trade publications and local business networks.",
  multicultural_language:"Use language media, cultural organizations, diaspora publishers and community partners. Localize rather than directly translate.",
  lgbtq:"Use trusted LGBTQ+ organizations, publishers and opt-in communities; do not use sensitive-trait ad targeting where prohibited.",
  parents:"Use parenting publishers, schools/PTAs where permitted, family organizations and referral programs.",
  tech_professionals:"Use developer communities, professional associations, newsletters, conferences and role-specific media."
};

app.get("/health",(req,res)=>res.json({ok:true,imageGeneration:!!client,webScout:!!client,version:"global-v1"}));
app.get("/api/groups",(req,res)=>res.json(groupGuidance));

app.post("/api/scout",auth,async(req,res)=>{
  const {country,region,language="auto",group="general_population",audience="adults",count=8}=req.body||{};
  if(!country) return res.status(400).json({error:"country_required"});
  const guide=groupGuidance[group]||groupGuidance.general_population;
  const fallback={
    configured:false,
    searchQueries:[
      `${country} ${audience} community organization newsletter`,
      `${country} ${audience} professional association`,
      `${country} ${audience} publisher newsletter advertising`,
      `${country} ${audience} nonprofit partnership`,
      `${country} mobile advertising research recruitment`
    ],
    archetypes:["local publishers/newsletters","professional associations","nonprofits/advocacy organizations","permission-based communities","mobile/SMS partners","referral networks","trade or professional media"],
    guidance:guide
  };
  if(!client) return res.json(fallback);
  try{
    const prompt=`You are a research-panel recruitment source scout for QuestionPro Audience. Find ${count} CURRENT, legitimate, permission-based recruitment sources in ${country}${region?`, ${region}`:""} for audience: ${audience}. Special group: ${group}. Guidance: ${guide}. Preferred language: ${language}. Include a mix of newsletters/publishers, professional or community associations, nonprofits, mobile channels, referral/community partners, and local media where relevant. Do not provide scraped personal emails, purchased lists, or tactics that violate platform policies. For sensitive populations, recommend trusted organizations/opt-in communities rather than sensitive-trait ad targeting. Return ONLY valid JSON with a top-level array named sources. Each source must have: name, type, geography, special_group, public_url, public_contact_route, why_fit, pilot_channel, pilot_size, localization_notes, source_id, quality_rationale.`;
    const response=await client.responses.create({model:"gpt-5-mini",tools:[{type:"web_search"}],input:prompt});
    let text=response.output_text||"";
    text=text.replace(/^```json\s*/i,"").replace(/```\s*$/," ").trim();
    let parsed; try{parsed=JSON.parse(text)}catch{parsed={raw:text}}
    res.json({configured:true,...parsed});
  }catch(err){res.status(500).json({error:"scout_failed",message:err.message,fallback});}
});

app.post("/api/creative/prompt",auth,(req,res)=>{
  const {country,region,city,language="local language",group="general_population",audience="adults",channel="social",message="Join a voluntary research community",brand="QuestionPro Audience"}=req.body||{};
  const guide=groupGuidance[group]||groupGuidance.general_population;
  const place=[city,region,country].filter(Boolean).join(", ");
  const prompt=`Create an authentic recruitment advertising image for ${brand} in ${place}. Audience: ${audience}. Special-group context: ${group}. Channel: ${channel}. Visuals should feel locally recognizable through everyday architecture, clothing, environments, devices, transport, workplaces or community settings without relying on stereotypes or flags as the main device. Show a diverse but plausible group of real adults relevant to the audience. Accessible composition, strong contrast, uncluttered mobile-first layout, space for headline text. Do not depict cash piles, deceptive guaranteed earnings, medical claims, political persuasion, or stigmatizing imagery. Do not visually infer or exaggerate sensitive traits. Message concept: ${message}. Language context: ${language}. ${guide} Photography style: contemporary documentary-commercial, natural light, credible research brand, 1:1 social creative.`;
  res.json({prompt});
});

app.post("/api/creative/generate",auth,async(req,res)=>{
  const {prompt,size="1024x1024",quality="low"}=req.body||{};
  if(!prompt) return res.status(400).json({error:"prompt_required"});
  if(!client) return res.status(503).json({error:"openai_api_key_not_configured",prompt});
  try{
    const result=await client.images.generate({model:"gpt-image-1-mini",prompt,size,quality});
    const item=result.data?.[0];
    if(!item) return res.status(502).json({error:"no_image_returned"});
    res.json({b64_json:item.b64_json||null,url:item.url||null,revised_prompt:item.revised_prompt||null});
  }catch(err){res.status(500).json({error:"image_generation_failed",message:err.message});}
});

app.listen(PORT,()=>console.log(`QuestionPro Audience recruiter API listening on ${PORT}`));
