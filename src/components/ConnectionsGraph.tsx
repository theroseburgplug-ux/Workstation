import React, { useEffect, useRef, useState } from 'react';

export default function ConnectionsGraph({ entities = [], width = 900, height = 360, onNodeClick, repel = 50000, spring = 0.08, linkDist = 140, damping = 0.88, stabilizeKey = 0 }: { entities?: any[]; width?: number; height?: number; onNodeClick?: (e: any)=>void; repel?: number; spring?: number; linkDist?: number; damping?: number; stabilizeKey?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; id?: string; name?: string; type?: string; linked?: boolean; degree?: number }>({ visible: false, x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  const simRef = useRef<{ raf?: number; running: boolean }>({ running: false });
  const lastUpdateRef = useRef<number>(0);

  // build nodes/links and initialize positions
  useEffect(() => {
    const ns = (entities || []).map((e, i) => ({ id: e.id, name: e.name, vx: 0, vy: 0, x: Math.random() * width, y: Math.random() * height, type: e.type || 'unknown', linkedClientId: e.linkedClientId || null, radius: 8, degree: 0 }));
    const ls: any[] = [];
    (entities || []).forEach(e => {
      (e.links || []).forEach((l:any) => {
        ls.push({ source: e.id, target: l.targetId });
      });
    });
    // compute degree for sizing
    const deg: Record<string, number> = {};
    ls.forEach(l => { deg[l.source] = (deg[l.source]||0) + 1; deg[l.target] = (deg[l.target]||0) + 1; });
    ns.forEach(n => { const d = deg[n.id] || 0; n.degree = d; n.radius = 8 + Math.log(d + 1) * 4; });
    setNodes(ns);
    setLinks(ls);
  }, [entities, width, height]);

  // basic JS force simulation (repulsion + springs)
  useEffect(() => {
    let running = true;
    const nodesMap = Object.fromEntries((nodes || []).map((n:any)=>[n.id, n]));
    const linkPairs = (links || []).map(l => ({ source: nodesMap[l.source], target: nodesMap[l.target], raw: l })).filter((p:any)=>p.source && p.target);

    const kRepel = repel; // repulsion strength
    const kSpring = spring; // spring stiffness
    const _linkDist = linkDist;
    const _damping = damping;

    const tick = () => {
      // repulsive forces
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.fx = a.fx || null; a.fy = a.fy || null;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx*dx + dy*dy + 0.01;
          const force = kRepel / dist2;
          const dist = Math.sqrt(dist2);
          const ux = dx / dist;
          const uy = dy / dist;
          a.vx += ux * force;
          a.vy += uy * force;
          b.vx -= ux * force;
          b.vy -= uy * force;
        }
      }

      // spring forces
      for (let i = 0; i < linkPairs.length; i++) {
        const p = linkPairs[i];
        const a = p.source;
        const b = p.target;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        const diff = dist - _linkDist;
        const fx = (dx / dist) * (diff * kSpring);
        const fy = (dy / dist) * (diff * kSpring);
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // integrate
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.fx != null) { n.x = n.fx; n.vx = 0; }
        if (n.fy != null) { n.y = n.fy; n.vy = 0; }
        n.vx *= _damping;
        n.vy *= _damping;
        n.x += n.vx * 0.02;
        n.y += n.vy * 0.02;
        // bounds
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));
      }

      if (!running) return;
      const now = performance.now();
      if (now - lastUpdateRef.current > 33) { // ~30fps
        setNodes((prev) => [...nodes]);
        lastUpdateRef.current = now;
      }
      simRef.current.raf = requestAnimationFrame(tick);
    };

    // initial relaxation to reduce popping
    if (nodes.length > 0) {
      // perform a few synchronous iterations to stabilize positions
      for (let i = 0; i < 60; i++) {
        // reuse tick logic but avoid scheduling raf
        // repulsive forces
        for (let aI = 0; aI < nodes.length; aI++) {
          const a = nodes[aI];
          a.fx = a.fx || null; a.fy = a.fy || null;
        }
        for (let aI = 0; aI < nodes.length; aI++) {
          for (let bI = aI+1; bI < nodes.length; bI++) {
            const a = nodes[aI];
            const b = nodes[bI];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let dist2 = dx*dx + dy*dy + 0.01;
            const force = (repel) / dist2;
            const dist = Math.sqrt(dist2);
            const ux = dx / dist;
            const uy = dy / dist;
            a.vx += ux * force;
            a.vy += uy * force;
            b.vx -= ux * force;
            b.vy -= uy * force;
          }
        }
        for (let pI = 0; pI < linkPairs.length; pI++) {
          const p = linkPairs[pI];
          const a = p.source;
          const b = p.target;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
          const diff = dist - linkDist;
          const fx = (dx / dist) * (diff * spring);
          const fy = (dy / dist) * (diff * spring);
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
        for (let nI = 0; nI < nodes.length; nI++) {
          const n = nodes[nI];
          if (n.fx != null) { n.x = n.fx; n.vx = 0; }
          if (n.fy != null) { n.y = n.fy; n.vy = 0; }
          n.vx *= _damping;
          n.vy *= _damping;
          n.x += n.vx * 0.02;
          n.y += n.vy * 0.02;
          n.x = Math.max(0, Math.min(width, n.x));
          n.y = Math.max(0, Math.min(height, n.y));
        }
      }
      if (simRef.current.raf) cancelAnimationFrame(simRef.current.raf);
      simRef.current.raf = requestAnimationFrame(tick);
    }

    return () => { running = false; if (simRef.current.raf) cancelAnimationFrame(simRef.current.raf); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, links.length]);

  // when stabilizeKey changes, run extra synchronous relaxation to stabilize layout
  useEffect(() => {
    if (!stabilizeKey || nodes.length === 0) return;
    const iters = 120;
    const nodesLocal = nodes;
    const nodesMap = Object.fromEntries((nodesLocal || []).map((n:any)=>[n.id, n]));
    const linkPairs = (links || []).map(l => ({ source: nodesMap[l.source], target: nodesMap[l.target] })).filter((p:any)=>p.source && p.target);
    for (let i = 0; i < iters; i++) {
      // repulsion
      for (let aI = 0; aI < nodesLocal.length; aI++) {
        for (let bI = aI+1; bI < nodesLocal.length; bI++) {
          const a = nodesLocal[aI];
          const b = nodesLocal[bI];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx*dx + dy*dy + 0.01;
          const force = repel / dist2;
          const dist = Math.sqrt(dist2);
          const ux = dx / dist;
          const uy = dy / dist;
          a.vx += ux * force;
          a.vy += uy * force;
          b.vx -= ux * force;
          b.vy -= uy * force;
        }
      }
      // springs
      for (let pI = 0; pI < linkPairs.length; pI++) {
        const p = linkPairs[pI];
        const a = p.source;
        const b = p.target;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        const diff = dist - linkDist;
        const fx = (dx / dist) * (diff * spring);
        const fy = (dy / dist) * (diff * spring);
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      for (let nI = 0; nI < nodesLocal.length; nI++) {
        const n = nodesLocal[nI];
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx * 0.02;
        n.y += n.vy * 0.02;
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));
      }
    }
    setNodes((prev) => [...nodesLocal]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stabilizeKey]);

  const nodeById = Object.fromEntries((nodes || []).map((n:any) => [n.id, n]));
  const neighborMap = React.useMemo(() => {
    const m: Record<string, Set<string>> = {};
    (links || []).forEach((l:any) => {
      m[l.source] = m[l.source] || new Set();
      m[l.target] = m[l.target] || new Set();
      m[l.source].add(l.target);
      m[l.target].add(l.source);
    });
    return m;
  }, [links]);

  const typeColorMap: Record<string,string> = {
    person: '#06b6d4',
    organization: '#8b5cf6',
    event: '#f97316',
    topic: '#10b981',
    unknown: '#94a3b8'
  };
  const colorFor = (t:any) => typeColorMap[(t||'').toLowerCase()] || typeColorMap.unknown;

  // pointer drag support (set fx/fy while dragging)
  const handlePointerDown = (ev: React.PointerEvent, node: any) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    node._dragging = true;
    node.fx = ev.clientX - rect.left;
    node.fy = ev.clientY - rect.top;
    setNodes(prev => [...prev]);
  };

  const handlePointerMove = (ev: React.PointerEvent, node: any) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if ((ev.currentTarget as Element).hasPointerCapture(ev.pointerId) && node._dragging) {
      node.fx = ev.clientX - rect.left;
      node.fy = ev.clientY - rect.top;
      setNodes(prev => [...prev]);
    }
  };

  const handlePointerUp = (ev: React.PointerEvent, node: any) => {
    try { (ev.currentTarget as Element).releasePointerCapture(ev.pointerId); } catch(e) {}
    node._dragging = false;
    node.fx = null; node.fy = null;
    setNodes(prev => [...prev]);
  };

  return (
    <div className="w-full overflow-auto">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="bg-background rounded">
        <g>
          {links.map((lk, i) => {
            const s = nodeById[lk.source];
            const t = nodeById[lk.target];
            if (!s || !t) return null;
            const isConnected = hoveredId && (hoveredId === s.id || hoveredId === t.id || (neighborMap[hoveredId] && (neighborMap[hoveredId].has(s.id) || neighborMap[hoveredId].has(t.id))));
            const opacity = hoveredId ? (isConnected ? 1 : 0.15) : 1;
            const stroke = hoveredId ? (isConnected ? '#94a3b8' : '#e6eef6') : '#cbd5e1';
            return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={stroke} strokeWidth={isConnected ? 2 : 1} opacity={opacity} />;
          })}

          {(nodes || []).map((n:any) => (
            <g key={n.id} transform={`translate(${n.x || width/2}, ${n.y || height/2})`} style={{ cursor: 'pointer' }}
               onPointerDown={(ev) => handlePointerDown(ev, n)}
               onPointerMove={(ev) => handlePointerMove(ev, n)}
               onPointerUp={(ev) => handlePointerUp(ev, n)}
               onPointerEnter={(ev) => {
                 const svg = svgRef.current; if (!svg) return;
                 const rect = svg.getBoundingClientRect();
                 const x = ev.clientX - rect.left + 10; const y = ev.clientY - rect.top + 10;
                 setTooltip({ visible: true, x, y, id: n.id, name: n.name, type: n.type, linked: !!n.linkedClientId, degree: n.degree || 0 });
                 setHoveredId(n.id);
               }}
               onPointerMove={(ev) => {
                 const svg = svgRef.current; if (!svg) return;
                 const rect = svg.getBoundingClientRect();
                 const x = ev.clientX - rect.left + 10; const y = ev.clientY - rect.top + 10;
                 setTooltip(t => t.visible ? { ...t, x, y } : t);
               }}
               onPointerLeave={() => { setTooltip({ visible: false, x: 0, y: 0 }); setHoveredId(null); }}
               onClick={() => onNodeClick && onNodeClick(entities.find((en:any)=>en.id === n.id))}>
              {(() => {
                const highlighted = hoveredId ? (hoveredId === n.id || (neighborMap[hoveredId] && neighborMap[hoveredId].has(n.id))) : true;
                const opacity = hoveredId ? (highlighted ? 1 : 0.25) : 1;
                return <circle r={n.linkedClientId ? 14 : 12} fill={colorFor(n.type)} stroke={n.linkedClientId ? '#0f172a' : 'transparent'} strokeWidth={n.linkedClientId ? 2 : 0} opacity={opacity} />;
              })()}
              {(() => {
                const maxLen = 20;
                const label = (n.name || 'Untitled') as string;
                const display = label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
                const fontSize = Math.max(10, Math.min(14, (n.radius || 12) / 1.2));
                return <text x={16} y={5} fontSize={fontSize} fill="#0f172a" style={{ opacity: hoveredId ? ((hoveredId === n.id || (neighborMap[hoveredId] && neighborMap[hoveredId].has(n.id))) ? 1 : 0.4) : 1 }}>{display}</text>;
              })()}
            </g>
          ))}
        </g>
      </svg>
      {tooltip.visible ? (() => {
        const maxX = Math.max(0, width - 220);
        const maxY = Math.max(0, height - 120);
        const left = Math.min(tooltip.x, maxX);
        const top = Math.min(tooltip.y, maxY);
        return (
          <div style={{ position: 'absolute', left, top, zIndex: 40 }} className="p-2 bg-card border rounded shadow text-sm w-[220px] pointer-events-none">
            <div className="font-medium">{tooltip.name}</div>
            <div className="text-xs text-muted-foreground">{tooltip.type} {tooltip.linked ? '• linked' : ''}</div>
            <div className="text-xs text-muted-foreground mt-1">Connections: {tooltip.degree}</div>
          </div>
        );
      })() : null}
    </div>
  );
}
