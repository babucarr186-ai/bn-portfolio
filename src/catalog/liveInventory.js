const ENDPOINT = 'https://uncle-apple-stock.jameel186.chatgpt.site/api/public-catalog';
let pending;
let fetchedAt=0;
export async function loadLiveCatalogs(){
  if(!pending || Date.now()-fetchedAt>15000){
    fetchedAt=Date.now();
    pending=fetch(ENDPOINT,{cache:'no-store',signal:AbortSignal.timeout(10000)})
      .then(response=>{if(!response.ok)throw new Error('Live stock unavailable');return response.json();})
      .then(data=>{if(!data.catalogs || !Array.isArray(data.catalogs.iphones))throw new Error('Invalid stock response');return data.catalogs;})
      .catch(error=>{pending=null;throw error;});
  }
  return pending;
}
