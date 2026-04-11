import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import "./App.css";

const AU="#B26A1D",AUL="#F5E3C7",AUS="#7A4B13";
const AV="#2F6B5E",AVL="#DCEEE7",AVS="#1F5147";
const AP="#6C5BA7",APL="#ECE8FA",APS="#4B3B84";
const GREY="#5F5A52",LIGHTGREY="#F4F1EC",BORDER="#E0DDD6";

const PRESETS={
  actores:{name:"🎬 Actores & Películas",uLabel:"Actores",vLabel:"Películas",
    U:["Alice","Bob","Carol","Dave"],V:["Film I","Film II","Film III"],
    edges:[[0,0],[0,1],[1,1],[1,2],[2,0],[2,2],[3,2],[3,1]]},
  cursos:{name:"📚 Estudiantes & Cursos",uLabel:"Estudiantes",vLabel:"Cursos",
    U:["Ana","Bruno","Carla","Diego"],V:["Redes","ML","Stats","Álgebra"],
    edges:[[0,0],[0,1],[1,0],[1,2],[2,1],[2,2],[3,2],[3,3],[0,3]]},
  autores:{name:"📄 Autores & Papers",uLabel:"Autores",vLabel:"Papers",
    U:["Autor 1","Autor 2","Autor 3","Autor 4"],V:["Paper A","Paper B","Paper C"],
    edges:[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[0,1],[3,0]]}
};

function buildB(U,V,edges){const B=U.map(()=>V.map(()=>0));edges.forEach(([u,v])=>{B[u][v]=1;});return B;}
function transpose(M){return M[0].map((_,j)=>M.map(r=>r[j]));}
function matMul(A,B){const r=A.length,c=B[0].length,k=B.length;return Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>Array.from({length:k},(_,l)=>A[i][l]*B[l][j]).reduce((a,b)=>a+b,0)));}

function computeProjections(U,V,edges){
  const uAdj=U.map(()=>new Set()),vAdj=V.map(()=>new Set());
  edges.forEach(([u,v])=>{uAdj[u].add(v);vAdj[v].add(u);});
  const uEdges=[],vEdges=[];
  for(let i=0;i<U.length;i++)for(let j=i+1;j<U.length;j++){
    const s=[...uAdj[i]].filter(v=>uAdj[j].has(v));
    if(s.length)uEdges.push({source:i,target:j,weight:s.length});
  }
  for(let i=0;i<V.length;i++)for(let j=i+1;j<V.length;j++){
    const s=[...vAdj[i]].filter(u=>vAdj[j].has(u));
    if(s.length)vEdges.push({source:i,target:j,weight:s.length});
  }
  return{uEdges,vEdges,uAdj,vAdj};
}

function redundancyCoeff(U,V,edges){
  const uAdj=U.map(()=>new Set());
  edges.forEach(([u,v])=>{uAdj[u].add(v);});
  const vals=U.map((_,u)=>{
    const nu=[...uAdj[u]];if(nu.length<2)return null;
    let pairs=0,shared=0;
    for(let a=0;a<nu.length;a++)for(let b=a+1;b<nu.length;b++){
      pairs++;
      if(U.some((_,w)=>w!==u&&uAdj[w].has(nu[a])&&uAdj[w].has(nu[b])))shared++;
    }
    return pairs>0?shared/pairs:0;
  }).filter(x=>x!==null);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
}

function nodfScore(U,V,edges){
  const uAdj=U.map(()=>new Set()),vAdj=V.map(()=>new Set());
  edges.forEach(([u,v])=>{uAdj[u].add(v);vAdj[v].add(u);});
  const sc=(nodes,adj)=>{let s=0,n=0;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const ki=adj[i].size,kj=adj[j].size;if(ki===kj||!ki||!kj)continue;
      const small=ki<kj?adj[i]:adj[j],big=ki<kj?adj[j]:adj[i];
      s+=[...small].filter(x=>big.has(x)).length/Math.min(ki,kj);n++;
    }return n?s/n:0;
  };
  return(((sc(U,uAdj)+sc(V,vAdj))/2)*100).toFixed(1);
}

/* ─── BipartiteGraph ─── */
function BipartiteGraph({U,V,edges,uLabel,vLabel,selectedU,setSelectedU,onToggleEdge}){
  const W=460,H=360,uX=110,vX=350,pad=50;
  const uPos=U.map((_,i)=>({x:uX,y:pad+i*(H-2*pad)/Math.max(U.length-1,1)}));
  const vPos=V.map((_,i)=>({x:vX,y:pad+i*(H-2*pad)/Math.max(V.length-1,1)}));
  const eSet=new Set(edges.map(([u,v])=>`${u}-${v}`));
  return(
    <svg width={W} height={H} style={{overflow:"visible",display:"block"}}>
      <text x={uX} y={20} textAnchor="middle" fontSize={12} fontWeight={600} fill={AUS}>{uLabel} (U)</text>
      <text x={vX} y={20} textAnchor="middle" fontSize={12} fontWeight={600} fill={AVS}>{vLabel} (V)</text>
      {selectedU!==null&&V.map((_,vi)=>!eSet.has(`${selectedU}-${vi}`)&&(
        <line key={`g${vi}`} x1={uPos[selectedU].x} y1={uPos[selectedU].y} x2={vPos[vi].x} y2={vPos[vi].y}
          stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 4" opacity={0.5} style={{cursor:"pointer"}} onClick={()=>onToggleEdge(selectedU,vi)}/>
      ))}
      {edges.map(([u,v],i)=>(
        <line key={i} x1={uPos[u].x} y1={uPos[u].y} x2={vPos[v].x} y2={vPos[v].y}
          stroke={selectedU===u?AU:"#64748b"} strokeWidth={selectedU===u?2.5:1.8}
          opacity={selectedU===null||selectedU===u?0.85:0.2} style={{cursor:"pointer"}} onClick={()=>onToggleEdge(u,v)}/>
      ))}
      {U.map((name,i)=>(
        <g key={i} style={{cursor:"pointer"}} onClick={()=>setSelectedU(selectedU===i?null:i)}>
          <circle cx={uPos[i].x} cy={uPos[i].y} r={23} fill={selectedU===i?AU:AUL} stroke={AUS} strokeWidth={selectedU===i?2.5:1.5}/>
          <text x={uPos[i].x} y={uPos[i].y} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill={selectedU===i?"white":AUS}>{name.length>7?name.slice(0,6)+"…":name}</text>
          <text x={uPos[i].x-32} y={uPos[i].y} textAnchor="end" dominantBaseline="central" fontSize={11} fill={GREY}>{name}</text>
        </g>
      ))}
      {V.map((name,i)=>(
        <g key={i} style={{cursor:selectedU!==null?"pointer":"default"}} onClick={()=>selectedU!==null&&onToggleEdge(selectedU,i)}>
          <circle cx={vPos[i].x} cy={vPos[i].y} r={23} fill={AVL} stroke={AVS} strokeWidth={1.5}/>
          <text x={vPos[i].x} y={vPos[i].y} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill={AVS}>{name.length>7?name.slice(0,6)+"…":name}</text>
          <text x={vPos[i].x+32} y={vPos[i].y} textAnchor="start" dominantBaseline="central" fontSize={11} fill={GREY}>{name}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── ProjectionGraph (D3 force) ─── */
function ProjectionGraph({nodes,projEdges,color,colorLight,colorStroke,height=240}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!ref.current)return;
    const W=ref.current.clientWidth||320;
    const svg=d3.select(ref.current);svg.selectAll("*").remove();
    if(!nodes.length)return;
    const nd=nodes.map((n,i)=>({id:i,name:n,x:W/2+(Math.random()-.5)*50,y:height/2+(Math.random()-.5)*50}));
    const ld=projEdges.map(e=>({...e,source:nd[e.source],target:nd[e.target]}));
    const maxW=Math.max(...projEdges.map(e=>e.weight),1);
    const sim=d3.forceSimulation(nd)
      .force("link",d3.forceLink(ld).distance(80).strength(0.6))
      .force("charge",d3.forceManyBody().strength(-160))
      .force("center",d3.forceCenter(W/2,height/2))
      .force("collision",d3.forceCollide(30));
    const lG=svg.append("g"),wG=svg.append("g"),nG=svg.append("g");
    const lines=lG.selectAll("line").data(ld).join("line").attr("stroke",color).attr("stroke-opacity",.65).attr("stroke-width",d=>1.5+3.5*d.weight/maxW);
    const wl=wG.selectAll("text").data(ld).join("text").attr("text-anchor","middle").attr("fill",colorStroke).attr("font-size",10).attr("font-weight",600).text(d=>`w=${d.weight}`);
    const ng=nG.selectAll("g").data(nd).join("g");
    ng.append("circle").attr("r",22).attr("fill",colorLight).attr("stroke",colorStroke).attr("stroke-width",1.8);
    ng.append("text").attr("text-anchor","middle").attr("dominant-baseline","central").attr("fill",colorStroke).attr("font-size",10).attr("font-weight",600).text(d=>d.name.length>8?d.name.slice(0,7)+"…":d.name);
    const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
    sim.on("tick",()=>{
      nd.forEach(d=>{d.x=cl(d.x,28,W-28);d.y=cl(d.y,28,height-28);});
      lines.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      wl.attr("x",d=>(d.source.x+d.target.x)/2).attr("y",d=>(d.source.y+d.target.y)/2-8);
      ng.attr("transform",d=>`translate(${d.x},${d.y})`);
    });
    return()=>sim.stop();
  },[nodes,projEdges,color,colorLight,colorStroke,height]);
  return <svg ref={ref} width="100%" height={height} style={{display:"block",width:"100%"}}/>;
}

/* ─── Matrix Multiplication Stepper ─── */
const MATRIX_GRID_CELL_SIZE=36;

function abbreviateStepperLabel(name){
  return name.length>5?`${name.slice(0,4)}…`:name;
}

function StepperMatrixGrid({matrix,rowNames,colNames,highlightRow,highlightCol,title,note,accentColor,accentLight}){
  return(
    <div style={{flex:1,minWidth:0}}>
      <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:GREY,textTransform:"uppercase",letterSpacing:.3}}>{title}</p>
      {note&&<p style={{margin:"0 0 6px",fontSize:10,color:"#94a3b8",fontFamily:"monospace"}}>{note}</p>}
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",fontSize:11}}>
          <thead><tr>
            <th style={{width:MATRIX_GRID_CELL_SIZE}}/>
            {colNames.map((name,j)=><th key={j} style={{width:MATRIX_GRID_CELL_SIZE,height:22,textAlign:"center",padding:"0 0 4px",
              color:highlightCol===j?accentColor:GREY,fontWeight:highlightCol===j?700:500,fontSize:10}}>{abbreviateStepperLabel(name)}</th>)}
          </tr></thead>
          <tbody>{matrix.map((row,i)=>(
            <tr key={i}>
              <td style={{paddingRight:6,textAlign:"right",fontSize:10,color:highlightRow===i?accentColor:GREY,fontWeight:highlightRow===i?700:500}}>{abbreviateStepperLabel(rowNames[i])}</td>
              {row.map((val,j)=>{
                const rowHighlighted=highlightRow===i;
                const colHighlighted=highlightCol===j;
                const bothHighlighted=rowHighlighted&&colHighlighted;
                return <td key={j} style={{width:MATRIX_GRID_CELL_SIZE,height:MATRIX_GRID_CELL_SIZE,textAlign:"center",border:`0.5px solid ${BORDER}`,
                  background:bothHighlighted?accentColor:rowHighlighted||colHighlighted?accentLight:"transparent",
                  color:bothHighlighted?"white":rowHighlighted||colHighlighted?accentColor:"#475569",
                  fontWeight:bothHighlighted||rowHighlighted||colHighlighted?700:400,fontSize:12,transition:"background .18s,color .18s"}}>{val}</td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function StepperResultGrid({matrix,rowNames,colNames,currentRow,currentCol,currentStep,totalCols,accentColor}){
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>
          <th style={{width:MATRIX_GRID_CELL_SIZE}}/>
          {colNames.map((name,j)=><th key={j} style={{width:MATRIX_GRID_CELL_SIZE,height:22,textAlign:"center",padding:"0 0 4px",
            color:currentCol===j?accentColor:GREY,fontWeight:currentCol===j?700:500,fontSize:10}}>{abbreviateStepperLabel(name)}</th>)}
        </tr></thead>
        <tbody>{matrix.map((row,i)=>(
          <tr key={i}>
            <td style={{paddingRight:6,textAlign:"right",fontSize:10,color:currentRow===i?accentColor:GREY,fontWeight:currentRow===i?700:500}}>{abbreviateStepperLabel(rowNames[i])}</td>
            {row.map((val,j)=>{
              const linearIndex=i*totalCols+j;
              const isTarget=i===currentRow&&j===currentCol;
              const isDone=linearIndex<currentStep;
              return <td key={j} style={{width:MATRIX_GRID_CELL_SIZE,height:MATRIX_GRID_CELL_SIZE,textAlign:"center",border:`0.5px solid ${BORDER}`,
                background:isTarget?accentColor:isDone?"#f1f5f9":"transparent",
                color:isTarget?"white":isDone?accentColor:"#94a3b8",
                fontWeight:isTarget?800:isDone?600:400,
                fontSize:isTarget?13:12,transition:"background .18s,color .18s"}}>{val||0}</td>;
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function MatrixStepperPanel({U,V,edges,mode,setMode}){
  const B=useMemo(()=>buildB(U,V,edges),[U,V,edges]);
  const Bt=useMemo(()=>transpose(B),[B]);
  const PU=useMemo(()=>matMul(B,Bt),[B,Bt]);
  const PV=useMemo(()=>matMul(Bt,B),[B,Bt]);

  const [step,setStep]=useState(0);

  const isU=mode==="U";
  const Left=isU?B:Bt;
  const Right=isU?Bt:B;
  const P=isU?PU:PV;
  const rowNames=isU?U:V;
  const colNames=isU?U:V;
  const innerNames=isU?V:U;
  const color=isU?AU:AV;
  const colorL=isU?AUL:AVL;
  const colorS=isU?AUS:AVS;
  const totalSteps=rowNames.length*colNames.length;
  const ci=Math.floor(step/colNames.length);
  const cj=step%colNames.length;
  const dotProd=innerNames.map((_,k)=>Left[ci][k]*Right[k][cj]);
  const result=dotProd.reduce((a,b)=>a+b,0);

  return(
    <div>
      {/* mode buttons */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["U","P_U = B · Bᵀ",AU,AUL],["V","P_V = Bᵀ · B",AV,AVL]].map(([m,lbl,c,cl])=>(
          <button key={m} onClick={()=>setMode(m)} style={{padding:"7px 18px",fontSize:13,borderRadius:8,
            cursor:"pointer",border:"none",background:mode===m?c:cl,
            color:mode===m?"white":c,fontWeight:mode===m?700:500,fontFamily:"monospace",transition:"all .15s"}}>{lbl}</button>
        ))}
      </div>

      {/* active cell banner */}
      <div style={{padding:"10px 14px",background:colorL,borderLeft:`3.5px solid ${colorS}`,borderRadius:8,marginBottom:16}}>
        <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:colorS}}>
          Celda [{abbreviateStepperLabel(rowNames[ci])}, {abbreviateStepperLabel(colNames[cj])}] &nbsp;·&nbsp; paso {step+1} de {totalSteps}
        </p>
        <p style={{margin:0,fontSize:12,color:colorS,fontFamily:"monospace",lineHeight:2}}>
          {dotProd.map((v,k)=>`${Left[ci][k]}×${Right[k][cj]}`).join(" + ")} = <strong>{result}</strong>
        </p>
        {ci===cj
          ?<p style={{margin:"4px 0 0",fontSize:11,color:colorS,opacity:.8}}>ℹ️ Diagonal: grado de {abbreviateStepperLabel(rowNames[ci])} = {result}</p>
          :result>0
            ?<p style={{margin:"4px 0 0",fontSize:11,color:colorS,opacity:.8}}>✓ {abbreviateStepperLabel(rowNames[ci])} y {abbreviateStepperLabel(colNames[cj])} comparten <strong>{result}</strong> vecino(s) → arista en proyección</p>
            :<p style={{margin:"4px 0 0",fontSize:11,color:colorS,opacity:.8}}>✗ Sin vecinos en común → no aparecen conectados en la proyección</p>
        }
      </div>

      {/* three matrices in a row */}
      <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16,overflowX:"auto"}}>
        <StepperMatrixGrid
          matrix={Left}
          rowNames={rowNames}
          colNames={innerNames}
          highlightRow={ci}
          highlightCol={-1}
          title={isU?"B":"Bᵀ"}
          note="fila i →"
          accentColor={color}
          accentLight={colorL}
        />
        <div style={{display:"flex",alignItems:"center",paddingTop:50,flexShrink:0,fontSize:22,color:GREY,opacity:.5}}>·</div>
        <StepperMatrixGrid
          matrix={Right}
          rowNames={innerNames}
          colNames={colNames}
          highlightRow={-1}
          highlightCol={cj}
          title={isU?"Bᵀ":"B"}
          note="← col j"
          accentColor={color}
          accentLight={colorL}
        />
        <div style={{display:"flex",alignItems:"center",paddingTop:50,flexShrink:0,fontSize:22,color:GREY,opacity:.5}}>=</div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:colorS,textTransform:"uppercase",letterSpacing:.3}}>{isU?"P_U = B·Bᵀ":"P_V = Bᵀ·B"}</p>
          <p style={{margin:"0 0 6px",fontSize:10,color:"#94a3b8",fontFamily:"monospace"}}>resultado parcial</p>
          <StepperResultGrid
            matrix={P}
            rowNames={rowNames}
            colNames={colNames}
            currentRow={ci}
            currentCol={cj}
            currentStep={step}
            totalCols={colNames.length}
            accentColor={color}
          />
        </div>
      </div>

      {/* dot product visual */}
      <div style={{background:LIGHTGREY,borderRadius:10,padding:"12px 14px",marginBottom:16,border:`0.5px solid ${BORDER}`}}>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:GREY}}>Producto punto — contribución de cada nodo intermedio</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {innerNames.map((name,k)=>{
            const lv=Left[ci][k],rv=Right[k][cj],prod=dotProd[k];
            const active=lv===1&&rv===1;
            return(
              <div key={k} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <div style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,
                    background:lv?color:"#e2e8f0",color:lv?"white":GREY,fontWeight:700,fontSize:13}}>{lv}</div>
                  <span style={{fontSize:11,color:GREY}}>×</span>
                  <div style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,
                    background:rv?color:"#e2e8f0",color:rv?"white":GREY,fontWeight:700,fontSize:13}}>{rv}</div>
                  <span style={{fontSize:11,color:GREY}}>=</span>
                  <div style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,
                    background:prod?colorL:"#f1f5f9",color:prod?color:GREY,fontWeight:700,fontSize:13,border:active?`1.5px solid ${color}`:"none"}}>{prod}</div>
                </div>
                <span style={{fontSize:9,color:"#94a3b8",maxWidth:60,textAlign:"center",lineHeight:1.2}}>{name}</span>
              </div>
            );
          })}
          <div style={{marginLeft:8,height:36,padding:"0 18px",background:color,color:"white",borderRadius:8,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",flexShrink:0}}>Σ = {result}</div>
        </div>
      </div>

      {/* progress + nav */}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
        <button onClick={()=>setStep(0)} disabled={step===0} style={navBtn(step===0)}>⟪</button>
        <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={navBtn(step===0)}>← Ant</button>
        <div style={{flex:1,height:5,background:BORDER,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",background:color,width:`${((step+1)/totalSteps)*100}%`,transition:"width .12s",borderRadius:4}}/>
        </div>
        <span style={{fontSize:11,color:GREY,minWidth:52,textAlign:"center"}}>{step+1}/{totalSteps}</span>
        <button onClick={()=>setStep(s=>Math.min(totalSteps-1,s+1))} disabled={step===totalSteps-1} style={navBtnPrimary(step===totalSteps-1,color)}>Sig →</button>
        <button onClick={()=>setStep(totalSteps-1)} disabled={step===totalSteps-1} style={navBtn(step===totalSteps-1)}>⟫</button>
      </div>

      {/* insight */}
      <div style={{padding:"12px 14px",background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10}}>
        <p style={{margin:"0 0 5px",fontSize:12,fontWeight:700,color:"#92400e"}}>🔑 Intuición algebraica</p>
        <p style={{margin:"0 0 8px",fontSize:12,color:"#78350f",lineHeight:1.7}}>
          Cada celda <strong>(i,j)</strong> es el <strong>producto punto</strong> de la fila i con la fila j de B.
          Su valor es alto cuando ambas filas tienen <strong>muchos 1s en las mismas columnas</strong> — es decir, cuando i y j comparten muchos vecinos en {isU?"V":"U"}.
          La <strong>diagonal (i=i)</strong> es el producto punto de la fila consigo misma = número de 1s = <em>grado del nodo</em>.
        </p>
        <p style={{margin:0,fontSize:12,color:"#78350f",lineHeight:1.7}}>
          ⚠️ <strong>Sesgo de alto grado:</strong> nodos con grado alto tienen más probabilidad de compartir vecinos por azar.
          El peso observado siempre debe compararse contra el peso esperado bajo el modelo nulo: <code style={{background:"#fef3c7",padding:"1px 5px",borderRadius:3}}>w_esp = k(i)·k(j)/|E|</code>
        </p>
      </div>
    </div>
  );
}

function MatrixStepper({U,V,edges}){
  const [mode,setMode]=useState("U");
  const resetKey=useMemo(
    ()=>`${mode}|${U.join("::")}|${V.join("::")}|${edges.map(([u,v])=>`${u}-${v}`).join(",")}`,
    [mode,U,V,edges]
  );

  return <MatrixStepperPanel key={resetKey} U={U} V={V} edges={edges} mode={mode} setMode={setMode}/>;
}

const navBtn=(disabled)=>({padding:"7px 12px",fontSize:12,borderRadius:7,border:`0.5px solid ${BORDER}`,background:"transparent",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1});
const navBtnPrimary=(disabled,color)=>({padding:"7px 14px",fontSize:12,borderRadius:7,border:"none",background:color,color:"white",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1,fontWeight:600});

/* ─── Smaller reusable components ─── */
function BiadjMatrix({U,V,edges}){
  const m=U.map(()=>V.map(()=>0));edges.forEach(([u,v])=>{m[u][v]=1;});
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"collapse"}}>
        <thead><tr><th style={{padding:"4px 6px",minWidth:52}}/>
          {V.map((v,j)=><th key={j} style={{padding:"4px 6px",color:AVS,fontWeight:600,textAlign:"center",fontSize:10,minWidth:40}}>{v.length>7?v.slice(0,6)+"…":v}</th>)}
        </tr></thead>
        <tbody>{U.map((u,i)=>(
          <tr key={i}><td style={{padding:"4px 6px",color:AUS,fontWeight:600,textAlign:"right",fontSize:10}}>{u.length>8?u.slice(0,7)+"…":u}</td>
            {V.map((_,j)=><td key={j} style={{padding:"5px 6px",textAlign:"center",border:`0.5px solid ${BORDER}`,background:m[i][j]?AUL:"transparent",fontWeight:m[i][j]?700:400,color:m[i][j]?AUS:"#94a3b8",fontSize:12}}>{m[i][j]}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ProjMatrix({nodes,projEdges,colorLight,colorStroke}){
  const n=nodes.length,m=Array.from({length:n},()=>Array(n).fill(0));
  projEdges.forEach(({source,target,weight})=>{m[source][target]=weight;m[target][source]=weight;});
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"collapse"}}>
        <thead><tr><th style={{padding:"3px 5px",minWidth:40}}/>
          {nodes.map((nd,j)=><th key={j} style={{padding:"3px 5px",color:colorStroke,fontWeight:600,fontSize:10,textAlign:"center",minWidth:38}}>{nd.length>6?nd.slice(0,5)+"…":nd}</th>)}
        </tr></thead>
        <tbody>{nodes.map((nd,i)=>(
          <tr key={i}><td style={{padding:"3px 5px",color:colorStroke,fontWeight:600,fontSize:10,textAlign:"right"}}>{nd.length>6?nd.slice(0,5)+"…":nd}</td>
            {nodes.map((_,j)=>(
              <td key={j} style={{padding:"3px 5px",textAlign:"center",fontSize:11,border:`0.5px solid ${BORDER}`,
                background:i===j?"#f8fafc":m[i][j]>0?colorLight:"transparent",
                fontWeight:m[i][j]>0?700:400,color:m[i][j]>0?colorStroke:"#94a3b8"}}>
                {i===j?"—":m[i][j]||"0"}
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DegBar({nodes,degs,color,label}){
  const maxD=Math.max(...degs,1);
  return(
    <div style={{background:LIGHTGREY,borderRadius:10,padding:"14px 14px 10px"}}>
      <p style={{margin:"0 0 10px",fontSize:12,fontWeight:600,color:GREY}}>{label}</p>
      <div style={{display:"flex",gap:6,alignItems:"flex-end",height:72}}>
        {nodes.map((name,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:10,color,fontWeight:700}}>{degs[i]}</span>
            <div style={{width:"100%",height:`${(degs[i]/maxD)*58+4}px`,background:color,opacity:.85,borderRadius:"3px 3px 0 0",transition:"height .3s"}}/>
            <span style={{fontSize:9,color:"#94a3b8",textAlign:"center",lineHeight:1.2}}>{name.length>5?name.slice(0,4)+"…":name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({label,value,sub,color}){
  return(
    <div style={{background:LIGHTGREY,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
      <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>{sub}</div>
      <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color:color||"#1e293b"}}>{value}</div>
      <div style={{fontSize:10,color:"#94a3b8",fontFamily:"monospace",marginTop:2}}>{label}</div>
    </div>
  );
}

function BackboneTable({U,edges,uEdges}){
  const uDegs=U.map((_,i)=>edges.filter(([u])=>u===i).length);
  const E=Math.max(edges.length,1);
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Arista (u₁ — u₂)","w obs","w_esp","ratio","Backbone?"].map(h=>(
          <th key={h} style={{padding:"7px 10px",textAlign:"left",color:GREY,fontWeight:500,borderBottom:`1px solid ${BORDER}`,fontSize:11}}>{h}</th>
        ))}</tr></thead>
        <tbody>{uEdges.map((e,idx)=>{
          const ku=uDegs[e.source],kv=uDegs[e.target];
          const wE=(ku*kv)/E,ratio=wE>0?e.weight/wE:0,sig=ratio>1.5;
          return <tr key={idx}>
            <td style={{padding:"6px 10px",borderBottom:`0.5px solid ${BORDER}`}}>{U[e.source]} — {U[e.target]}</td>
            <td style={{padding:"6px 10px",borderBottom:`0.5px solid ${BORDER}`,fontWeight:700,color:AU,fontFamily:"monospace"}}>{e.weight}</td>
            <td style={{padding:"6px 10px",borderBottom:`0.5px solid ${BORDER}`,fontFamily:"monospace",color:GREY}}>{wE.toFixed(2)}</td>
            <td style={{padding:"6px 10px",borderBottom:`0.5px solid ${BORDER}`,fontFamily:"monospace",color:ratio>1.5?AU:GREY,fontWeight:ratio>1.5?700:400}}>{ratio.toFixed(2)}×</td>
            <td style={{padding:"6px 10px",borderBottom:`0.5px solid ${BORDER}`}}>
              <span style={{padding:"2px 10px",borderRadius:5,background:sig?AUL:"#f1f5f9",color:sig?AUS:GREY,fontWeight:600,fontSize:11}}>{sig?"✓ Sí":"✗ No"}</span>
            </td>
          </tr>;
        })}</tbody>
      </table>
      <p style={{fontSize:10,color:"#94a3b8",margin:"6px 0 0"}}>w_esp = k(u₁)·k(u₂)/|E| — modelo nulo de configuración bipartita. Ratio &gt; 1.5 = criterio ilustrativo.</p>
    </div>
  );
}

/* ─── Theory cards ─── */
const THEORY=[
  {title:"Definición formal",f:"G=(U,V,E), E⊆U×V",body:"Dos conjuntos disjuntos de nodos. Las aristas solo cruzan entre U y V — nunca dentro del mismo conjunto.",top:AU},
  {title:"Condición bipartita",f:"G bipartito ↔ sin ciclos de longitud impar",body:"Equivalente a 2-coloreable. El ciclo más corto posible es de longitud 4 (cuadrado), no triángulos.",top:AU},
  {title:"Biadjacencia B",f:"B ∈ {0,1}|U|×|V|",body:"Matriz rectangular |U|×|V|, no cuadrada. Mucho más compacta que la adjyacencia para redes muy bipartitas.",top:AU},
  {title:"Proyección P_U",f:"[B·Bᵀ]_ij = |N(i)∩N(j)|",body:"Nodos de U conectados si comparten vecino en V. Peso = vecinos en común. Diagonal = grado en bipartita.",top:AV},
  {title:"Proyección P_V",f:"[Bᵀ·B]_ij = |N(i)∩N(j)|",body:"Análogo para V. Cada arista de la proyección corresponde a al menos un 4-ciclo en la red bipartita original.",top:AV},
  {title:"Pérdida de información",f:"∃G≠G': P_U(G)=P_U(G')",body:"Las proyecciones no son invertibles. Distintas bipartitas pueden generar la misma proyección.",top:AV},
  {title:"4-ciclos (mariposas)",f:"□=u₁–v₁–u₂–v₂–u₁",body:"Motivo fundamental de redes bipartitas. Toda arista en la proyección corresponde a ≥1 cuadrado. Son el análogo de los triángulos en redes unimodales.",top:AP},
  {title:"Redundancia (Latapy 2008)",f:"RC(u) = pares con vecino común / C(k_u,2)",body:"Clustering local adaptado a bipartitas. Mide qué fracción de los pares de vecinos de u comparten al menos un vecino adicional.",top:AP},
  {title:"Nestedness (NODF)",f:"NODF ∈ [0,100]",body:"¿Los vecindarios de nodos de bajo grado son subconjunto de los de alto grado? Crucial en ecología (plantas–polinizadores) y economía (países–productos).",top:AP},
  {title:"Modelo nulo bipartito",f:"w_esp(u₁,u₂) = k(u₁)·k(u₂)/|E|",body:"Peso esperado por azar bajo la configuración bipartita. Siempre comparar pesos observados con este baseline antes de interpretarlos.",top:"#94a3b8"},
  {title:"Backbone extraction",f:"H₀: w ≤ w_esp, rechazar si p < α",body:"Proyecciones densas tienen aristas triviales. El filtro de disparidad (Serrano 2009) o el modelo hipergeométrico (Neal 2014) retienen co-ocurrencias no explicadas por azar.",top:"#94a3b8"},
  {title:"Densidad bipartita",f:"ρ = |E|/(|U|×|V|)",body:"Fracción de aristas posibles. Redes reales son muy dispersas. Baja densidad en la bipartita puede implicar alta densidad en la proyección.",top:"#94a3b8"},
];

/* ═══════════════ APP ═══════════════ */
export default function App(){
  const [tab,setTab]=useState("concepto");
  const [pKey,setPKey]=useState("actores");
  const [data,setData]=useState(PRESETS.actores);
  const [edges,setEdges]=useState(PRESETS.actores.edges);
  const [selU,setSelU]=useState(null);

  const {uEdges,vEdges}=useMemo(()=>computeProjections(data.U,data.V,edges),[data.U,data.V,edges]);
  const loadPreset=k=>{const p=PRESETS[k];setPKey(k);setData(p);setEdges(p.edges);setSelU(null);};
  const toggleEdge=(u,v)=>{
    const exists=edges.some(([eu,ev])=>eu===u&&ev===v);
    setEdges(exists?edges.filter(([eu,ev])=>!(eu===u&&ev===v)):[...edges,[u,v]]);
  };

  const uDegs=data.U.map((_,i)=>edges.filter(([u])=>u===i).length);
  const vDegs=data.V.map((_,i)=>edges.filter(([,v])=>v===i).length);
  const density=edges.length/(data.U.length*data.V.length);
  const avgKU=(uDegs.reduce((a,b)=>a+b,0)/data.U.length).toFixed(2);
  const avgKV=(vDegs.reduce((a,b)=>a+b,0)/data.V.length).toFixed(2);
  const rc=redundancyCoeff(data.U,data.V,edges).toFixed(3);
  const nd=nodfScore(data.U,data.V,edges);
  const butterflies=uEdges.reduce((a,e)=>a+Math.max(0,e.weight*(e.weight-1)/2),0);
  const densityPU=data.U.length>1?(uEdges.length/(data.U.length*(data.U.length-1)/2)).toFixed(3):"—";

  const TABS=[["concepto","Concepto"],["constructor","Constructor"],["algebra","Álgebra matricial"],["proyecciones","Proyecciones"],["analisis","Análisis"]];

  return(
    <div className="app-shell">
      <header className="editorial-hero">
        <div className="editorial-badge">Curso Redes y Sistemas Complejos</div>
        <h1>Redes bipartitas y sus proyecciones</h1>
        <p className="editorial-subtitle">De la biadjacencia a las proyecciones ponderadas</p>
        <p className="editorial-lead">
          Recurso interactivo del curso Redes y Sistemas Complejos dedicado a redes bipartitas, matrices de biadjacencia, proyecciones, backbone extraction y nestedness. Combina intuición algebraica, edición directa de grafos y análisis visual para explorar cómo se conserva y se pierde información al proyectar.
        </p>
        <p className="editorial-meta">
          Recurso desarrollado por
          <a href="https://www.crcandia.com/" target="_blank" rel="noopener noreferrer">Cristian Candia</a>
          en
          <a href="https://criss-lab.com/" target="_blank" rel="noopener noreferrer">CRiSS Lab</a>.
        </p>
      </header>

      <main className="app-main">
        <div className="editorial-shell">
          <div className="editorial-tabs">
            {TABS.map(([id,label])=>(
              <button
                key={id}
                className={`editorial-tab${tab===id?" active":""}`}
                onClick={()=>setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CONCEPTO */}
          {tab==="concepto"&&(
            <section className="editorial-panel editorial-stack">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(248px,1fr))",gap:12}}>
                {THEORY.map((c,i)=>(
                  <div key={i} style={{background:"#fcfbf8",border:`0.5px solid ${BORDER}`,borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${c.top}`,boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>
                    <p style={{margin:"0 0 6px",fontSize:13,fontWeight:700,color:"#1e293b"}}>{c.title}</p>
                    <p style={{margin:"0 0 10px",fontSize:12,lineHeight:1.65,color:"#475569"}}>{c.body}</p>
                    <div style={{background:LIGHTGREY,borderRadius:6,padding:"5px 10px",fontFamily:"monospace",fontSize:11,color:"#334155"}}>{c.f}</div>
                  </div>
                ))}
              </div>
              <div className="editorial-note-grid">
                <div className="editorial-note warm">
                  <p style={{margin:"0 0 5px",fontSize:13,fontWeight:700,color:"#92400e"}}>💡 Álgebra clave</p>
                  <p style={{margin:0,fontSize:12,color:"#78350f",lineHeight:1.7}}>
                    <strong>B·Bᵀ</strong> = pesos P_U, &nbsp;<strong>Bᵀ·B</strong> = pesos P_V. La diagonal = grado del nodo. Ve a <em>Álgebra matricial</em> para verlo paso a paso.
                  </p>
                </div>
                <div className="editorial-note cool">
                  <p style={{margin:"0 0 5px",fontSize:13,fontWeight:700,color:"#14532d"}}>⚠️ Backbone obligatorio</p>
                  <p style={{margin:0,fontSize:12,color:"#166534",lineHeight:1.7}}>
                    Las proyecciones ponderadas están sesgadas por el grado. <strong>Siempre compara pesos con el modelo nulo</strong> antes de interpretar co-ocurrencias como significativas.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* CONSTRUCTOR */}
          {tab==="constructor"&&(
            <section className="editorial-panel editorial-stack">
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                {Object.entries(PRESETS).map(([k,p])=>(
                  <button key={k} onClick={()=>loadPreset(k)} style={{padding:"6px 14px",fontSize:12.5,borderRadius:8,cursor:"pointer",
                    border:pKey===k?`2px solid ${AUS}`:`1px solid ${BORDER}`,background:pKey===k?AUL:"#fff",
                    color:pKey===k?AUS:GREY,fontWeight:pKey===k?700:500,transition:"all .15s",boxShadow:pKey===k?"0 1px 2px rgba(0,0,0,0.04)":"none"}}>{p.name}</button>
                ))}
              </div>
              <div style={{padding:"8px 12px",background:LIGHTGREY,borderRadius:8,marginBottom:16,fontSize:12,color:GREY,border:`0.5px solid ${BORDER}`}}>
                <span style={{color:AUS,fontWeight:700}}>1.</span> Clic en <span style={{color:AUS,fontWeight:600}}>{data.uLabel}</span> para seleccionar. &ensp;
                <span style={{color:AVS,fontWeight:700}}>2.</span> Clic en <span style={{color:AVS,fontWeight:600}}>{data.vLabel}</span> para agregar/quitar arista. &ensp;
                <span style={{fontWeight:700}}>3.</span> Clic en arista existente para eliminar.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,alignItems:"start"}}>
                <BipartiteGraph U={data.U} V={data.V} edges={edges} uLabel={data.uLabel} vLabel={data.vLabel}
                  selectedU={selU} setSelectedU={setSelU} onToggleEdge={toggleEdge}/>
                <div style={{minWidth:200}}>
                  <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600,color:GREY}}>Biadjacencia B</p>
                  <BiadjMatrix U={data.U} V={data.V} edges={edges}/>
                  <div style={{marginTop:14,display:"grid",gap:5}}>
                    {[["Nodos U",data.U.length],["Nodos V",data.V.length],["Aristas |E|",edges.length],["Densidad ρ",density.toFixed(3)],["k̄ U",avgKU],["k̄ V",avgKV]].map(([lb,val])=>(
                      <div key={lb} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:`0.5px solid ${BORDER}`}}>
                        <span style={{color:GREY}}>{lb}</span><span style={{fontWeight:700,fontFamily:"monospace"}}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ÁLGEBRA MATRICIAL */}
          {tab==="algebra"&&(
            <section className="editorial-panel editorial-stack">
              <div style={{padding:"10px 14px",background:APL,borderLeft:`3.5px solid ${APS}`,borderRadius:8,marginBottom:18}}>
                <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:APS}}>De la biadjacencia a la proyección ponderada — paso a paso</p>
                <p style={{margin:0,fontSize:12,color:APS,lineHeight:1.7}}>
                  Cada celda (i,j) de B·Bᵀ es el <strong>producto punto</strong> de las filas i y j de B.
                  Navega celda a celda y observa qué operación la genera. Presta atención a la diagonal y a las celdas con resultado 0.
                  Cambia la red en <em>Constructor</em> y regresa para ver cómo varía.
                </p>
              </div>
              <MatrixStepper U={data.U} V={data.V} edges={edges}/>
            </section>
          )}

          {/* PROYECCIONES */}
          {tab==="proyecciones"&&(
            <section className="editorial-panel editorial-stack">
              <p style={{margin:"0 0 14px",fontSize:13,color:"#475569",lineHeight:1.65,padding:"10px 14px",background:LIGHTGREY,borderRadius:8,border:`0.5px solid ${BORDER}`}}>
                Nodos del mismo conjunto se conectan si comparten al menos un vecino. El grosor de arista es proporcional al peso compartido.
              </p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20}}>
                {[{label:`P_U — ${data.uLabel}`,nodes:data.U,pe:uEdges,c:AU,cl:AUL,cs:AUS},
                  {label:`P_V — ${data.vLabel}`,nodes:data.V,pe:vEdges,c:AV,cl:AVL,cs:AVS}].map(({label,nodes,pe,c,cl,cs})=>(
                  <div key={label}>
                    <div style={{padding:"8px 12px",marginBottom:10,background:cl,borderRadius:8,borderLeft:`3.5px solid ${cs}`}}>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:cs}}>{label}</p>
                      <p style={{margin:"3px 0 0",fontSize:11,color:cs}}>{pe.length} aristas · {nodes.length} nodos</p>
                    </div>
                    <div style={{background:LIGHTGREY,borderRadius:10,padding:8}}>
                      <ProjectionGraph nodes={nodes} projEdges={pe} color={c} colorLight={cl} colorStroke={cs} height={220}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,marginTop:20}}>
                {[{label:"Matriz P_U (B·Bᵀ)",nodes:data.U,pe:uEdges,cl:AUL,cs:AUS},
                  {label:"Matriz P_V (Bᵀ·B)",nodes:data.V,pe:vEdges,cl:AVL,cs:AVS}].map(({label,nodes,pe,cl,cs})=>(
                  <div key={label}>
                    <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600,color:GREY}}>{label}</p>
                    <ProjMatrix nodes={nodes} projEdges={pe} colorLight={cl} colorStroke={cs}/>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ANÁLISIS */}
          {tab==="analisis"&&(
            <section className="editorial-panel editorial-stack">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:20}}>
                <Stat label="|U|" value={data.U.length} sub="Nodos U"/>
                <Stat label="|V|" value={data.V.length} sub="Nodos V"/>
                <Stat label="|E|" value={edges.length} sub="Aristas"/>
                <Stat label="ρ" value={density.toFixed(3)} sub="Densidad bipartita"/>
                <Stat label="k̄_U" value={avgKU} sub="Grado medio U" color={AU}/>
                <Stat label="k̄_V" value={avgKV} sub="Grado medio V" color={AV}/>
                <Stat label="RC" value={rc} sub="Redundancia Latapy" color={AP}/>
                <Stat label="NODF" value={`${nd}%`} sub="Nestedness" color={AP}/>
                <Stat label="|E_{P_U}|" value={uEdges.length} sub="Aristas en P_U" color={AU}/>
                <Stat label="|E_{P_V}|" value={vEdges.length} sub="Aristas en P_V" color={AV}/>
                <Stat label="□" value={butterflies} sub="4-ciclos (mariposas)" color={AP}/>
                <Stat label="ρ_{P_U}" value={densityPU} sub="Densidad P_U"/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
                <DegBar nodes={data.U} degs={uDegs} color={AU} label={`Distribución de grado — ${data.uLabel}`}/>
                <DegBar nodes={data.V} degs={vDegs} color={AV} label={`Distribución de grado — ${data.vLabel}`}/>
              </div>

              {/* backbone */}
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:3,height:16,background:AU,borderRadius:2}}/>
                  <p style={{margin:0,fontSize:13,fontWeight:700}}>Backbone extraction — Proyección P_U</p>
                </div>
                <p style={{margin:"0 0 10px",fontSize:12,color:GREY,lineHeight:1.6}}>
                  Comparación de cada arista de P_U contra el modelo nulo bipartito. Aristas con ratio bajo son candidatas a eliminarse.
                </p>
                {uEdges.length>0
                  ?<BackboneTable U={data.U} edges={edges} uEdges={uEdges}/>
                  :<p style={{color:"#94a3b8",fontSize:13}}>Sin aristas en P_U con la configuración actual.</p>}
              </div>

              {/* nestedness bar */}
              <div style={{padding:"13px 16px",background:APL,borderRadius:10,border:`0.5px solid ${APS}`,marginBottom:16}}>
                <p style={{margin:"0 0 6px",fontSize:13,fontWeight:700,color:APS}}>Nestedness NODF: {nd}%</p>
                <p style={{margin:"0 0 10px",fontSize:12,color:APS,lineHeight:1.65}}>
                  100% = perfectamente anidado (toda fila de menor grado es subconjunto de la de mayor grado). 0% = estructura en bloques perfecta.
                </p>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:APS,minWidth:68}}>0% bloques</span>
                  <div style={{flex:1,height:10,background:"#ddd6fe",borderRadius:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${nd}%`,background:AP,borderRadius:5,transition:"width .4s"}}/>
                  </div>
                  <span style={{fontSize:11,color:APS,minWidth:76,textAlign:"right"}}>100% anidado</span>
                </div>
              </div>

              {/* degree tables */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
                {[{label:data.uLabel,nodes:data.U,degs:uDegs,cs:AUS,cl:AUL},
                  {label:data.vLabel,nodes:data.V,degs:vDegs,cs:AVS,cl:AVL}].map(({label,nodes,degs,cs,cl})=>(
                  <div key={label}>
                    <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:GREY}}>{label} — grado nodal</p>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr>{["Nodo","k",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#94a3b8",fontWeight:500,borderBottom:`1px solid ${BORDER}`,fontSize:11}}>{h}</th>)}</tr></thead>
                      <tbody>{nodes.map((name,i)=>(
                        <tr key={i}>
                          <td style={{padding:"5px 10px",borderBottom:"0.5px solid #f1f5f9"}}>{name}</td>
                          <td style={{padding:"5px 10px",textAlign:"center",borderBottom:"0.5px solid #f1f5f9"}}>
                            <span style={{background:cl,color:cs,fontWeight:700,fontSize:11,padding:"2px 9px",borderRadius:5}}>{degs[i]}</span>
                          </td>
                          <td style={{padding:"5px 10px",borderBottom:"0.5px solid #f1f5f9"}}>
                            <div style={{height:8,width:`${(degs[i]/Math.max(...degs,1))*100}%`,background:cs,borderRadius:4,opacity:.8,minWidth:4}}/>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <span>Redes y Sistemas Complejos · Redes Bipartitas · by</span>
        <a
          className="site-footer-link"
          href="https://www.crcandia.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir el sitio de Cristian Candia en una nueva pestaña"
        >
          Cristian Candia, Ph.D.
        </a>
        <span>·</span>
        <a
          className="site-footer-link"
          href="https://criss-lab.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir CRiSS Lab en una nueva pestaña"
        >
          CRiSS Lab
        </a>
      </footer>
    </div>
  );
}
