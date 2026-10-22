"use strict";
const login=require('./_dashlib'), drafts=require('./_studio/drafts');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 if(!login.requireLogin(req,res))return;
 if(req.method==='POST'){
  try { if(!req.headers.origin || new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Save drafts from the dashboard on this website.'}); }
  catch{return res.status(400).json({error:'Invalid request origin.'});}
 }
 try{return res.status(200).json(req.method==='GET'?await drafts.read(req.query?.previous != null ? Number(req.query.previous) : null):await drafts.save(login.readJsonBody(req)));}
 catch(e){return res.status(e.status||500).json({error:e.status?e.message:'The private team draft could not be saved. Your browser copy is retained.'});}
};
