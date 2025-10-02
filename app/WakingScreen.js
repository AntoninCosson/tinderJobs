'use client';
export default function WakingScreen() {
  return (
    <div style={{minHeight:'100dvh', display:'grid', placeItems:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{marginBottom:12}}>Réveil de n8n…</div>
        <div style={{fontSize:12, opacity:0.7}}>Ça peut prendre ~30–60s si le service est en veille</div>
      </div>
    </div>
  );
}