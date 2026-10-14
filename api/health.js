// Does not contact external services. Use to distinguish Vercel routing failures from provider outages.
export function GET(){
 return Response.json({service:'AirGuard',status:'ok',version:'3.0.0',apiRoute:'ready',timestamp:new Date().toISOString()},
 {status:200,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
