const fs=require('fs');
const files=[
  'backend/src/index.js',
  'backend/src/services/recommendationService.js',
  'backend/src/services/incidentService.js',
  'backend/src/routes/api.js',
  'simulator/src/index.js',
  'simulator/src/gateway.js',
  'simulator/src/sensor.js',
  'frontend/app.js'
];
files.forEach(f=>{
  try {
    let content=fs.readFileSync(f,'utf8');
    content=content.replace(/\\\`/g,'\`');
    content=content.replace(/\\\$/g,'$');
    fs.writeFileSync(f,content);
    console.log("Fixed", f);
  } catch(e){ console.error(e) }
});
