/*
DerivLikeApp.jsx
Single-file React component (default export) that implements a mock "Deriv-like" trading front-end.

How to use
1. Create a new Vite + React project or use Create React App.
2. Install dependencies:
   npm install react recharts lucide-react framer-motion
   (Tailwind CSS should be configured in your project for styling.)
3. Drop this file into src/ and import it from App.jsx or replace App.jsx content with:
   import DerivLikeApp from './DerivLikeApp';
   export default function App(){ return <DerivLikeApp/> }
4. Run: npm run dev (vite) or npm start (CRA)

Notes
- This is a front-end mock. Real trading requires server-side order handling and a regulated broker API. Replace the mock/socket handlers with your broker's WebSocket/REST endpoints and insert the API token where indicated.
- The UI uses Tailwind classes. If you don't have Tailwind, basic layout will still work but style will be different.
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MessageSquare, ArrowUpCircle, ArrowDownCircle, Settings, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DerivLikeApp(){
  // Replace with real credentials/API endpoint in production
  const [apiToken, setApiToken] = useState(''); // set in Settings modal
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(1000.00);
  const [position, setPosition] = useState(null);
  const [price, setPrice] = useState(1.1000);
  const [candles, setCandles] = useState([]);
  const [orders, setOrders] = useState([]);
  const wsRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([ {id:1, user:'System', text:'Welcome to your demo trading app.'} ]);
  const [feed, setFeed] = useState([]);
  const [binaryDigits, setBinaryDigits] = useState(Array.from({length:10}, (_,i)=>i));

  useEffect(()=>{
    // initialize mock candle data
    const now = Date.now();
    const initial = Array.from({length:80}).map((_,i)=>{
      const t = new Date(now - (80-i)*1000);
      const p = +(1.08 + Math.sin((i/10))*0.01 + Math.random()*0.002).toFixed(5);
      return { time: t.toLocaleTimeString(), price: p };
    });
    setCandles(initial);
    setPrice(initial[initial.length-1].price);
  },[]);

  useEffect(()=>{
    // Mock live price updates
    const iv = setInterval(()=>{
      setPrice(prev=>{
        const delta = (Math.random()-0.5)*0.0015;
        const next = +(prev + delta).toFixed(5);
        const time = new Date().toLocaleTimeString();
        setCandles(c=>{ const nc = [...c, {time, price: next}].slice(-200); return nc; });
        // publish feed
        setFeed(f=>[{type:'price', text:`Price ${next}` , time}, ...f].slice(0,50));
        return next;
      });
    }, 950);
    return ()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    // Mock order fills processing
    const iv = setInterval(()=>{
      setOrders(os=>{
        if(os.length === 0) return os;
        const updated = os.map(o=>{
          if(o.status==='pending' && Math.random() > 0.5){
            const profit = +( (o.side==='buy' ? (price - o.price) : (o.price - price)) * (o.size*100)).toFixed(2);
            setBalance(b=>+(b + profit).toFixed(2));
            setFeed(f=>[{type:'trade', text:`Order ${o.id} filled, P/L ${profit}` , time: new Date().toLocaleTimeString()}, ...f].slice(0,50));
            return {...o, status:'filled', filledAt: new Date().toLocaleTimeString(), pnl: profit};
          }
          return o;
        });
        return updated;
      });
    }, 3500);
    return ()=>clearInterval(iv);
  },[price]);

  // trading functions
  function placeOrder({side, size}){
    const id = Math.random().toString(36).slice(2,9);
    const ord = { id, side, size, price, status:'pending', placedAt: new Date().toLocaleTimeString() };
    setOrders(o=>[ord, ...o].slice(0,50));
    setFeed(f=>[{type:'order', text:`Placed ${side.toUpperCase()} @ ${price} size ${size}`, time: ord.placedAt}, ...f].slice(0,50));
  }

  function toggleConnect(){
    if(connected){
      // disconnect
      setConnected(false);
      setFeed(f=>[{type:'system', text:'Disconnected from market', time: new Date().toLocaleTimeString()}, ...f].slice(0,50));
    } else {
      // connect (mock)
      if(!apiToken){
        setFeed(f=>[{type:'error', text:'No API token configured. Use settings.', time: new Date().toLocaleTimeString()}, ...f].slice(0,50));
        return;
      }
      setConnected(true);
      setFeed(f=>[{type:'system', text:'Connected to market (mock)', time: new Date().toLocaleTimeString()}, ...f].slice(0,50));
    }
  }

  // chat
  function sendChat(text){
    const msg = { id: Date.now(), user:'You', text };
    setChatMessages(m=>[msg, ...m]);
  }

  // helper UI components
  const Header = ()=> (
    <header className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
      <div className="flex items-center gap-3">
        <div className="font-bold text-xl">Deriv-like Demo</div>
        <div className="text-xs opacity-80">Simulated trading front-end</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm">Balance: <span className="font-mono">${balance.toFixed(2)}</span></div>
        <button onClick={toggleConnect} className={`px-3 py-1 rounded ${connected ? 'bg-green-500' : 'bg-slate-700'}`}>
          {connected ? 'Connected' : 'Connect'}
        </button>
        <button onClick={()=>{ const token = prompt('Paste API token (demo):'); if(token) setApiToken(token); }} className="p-1 rounded bg-slate-600"><Settings size={16}/></button>
      </div>
    </header>
  );

  const PriceChart = ()=>{
    const data = useMemo(()=>candles.map(c=>({name:c.time, pv:c.price})),[candles]);
    return (
      <div className="h-64 bg-white/5 rounded p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" hide />
            <YAxis domain={[dataMin=>dataMin*0.999, dataMax=>dataMax*1.001]} hide />
            <Tooltip />
            <Line type="monotone" dataKey="pv" strokeWidth={2} stroke="#10b981" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const TradePanel = ()=>{
    const [size, setSize] = useState(1);
    return (
      <div className="p-3 bg-slate-800 rounded flex flex-col gap-3">
        <div className="text-sm opacity-80">Market: EUR/USD</div>
        <div className="text-3xl font-mono">{price}</div>
        <div className="flex gap-2">
          <input type="number" min={0.01} step={0.01} value={size} onChange={e=>setSize(Number(e.target.value))} className="w-full p-2 rounded bg-slate-700" />
        </div>
        <div className="flex gap-2">
          <button onClick={()=>placeOrder({side:'buy', size})} className="flex-1 p-2 rounded bg-emerald-500">Buy <ArrowUpCircle size={16} className="inline-block ml-2"/></button>
          <button onClick={()=>placeOrder({side:'sell', size})} className="flex-1 p-2 rounded bg-rose-500">Sell <ArrowDownCircle size={16} className="inline-block ml-2"/></button>
        </div>
        <div className="text-xs opacity-70">Tip: This is a demo. Replace mock price with your broker's real-time feed.</div>
      </div>
    );
  };

  const OrdersView = ()=>{
    return (
      <div className="p-3 bg-slate-900 rounded overflow-auto" style={{maxHeight:250}}>
        <div className="text-sm font-semibold mb-2">Orders</div>
        {orders.length === 0 && <div className="text-xs opacity-60">No orders yet.</div>}
        <ul className="space-y-2">
          {orders.map(o=> (
            <li key={o.id} className="p-2 bg-slate-800 rounded flex justify-between items-center">
              <div>
                <div className="text-sm font-mono">{o.side.toUpperCase()} {o.size} @ {o.price}</div>
                <div className="text-xs opacity-60">{o.status} • {o.placedAt}</div>
              </div>
              <div className="text-right text-xs">
                {o.status === 'filled' ? <div>P/L {o.pnl}</div> : <div className="opacity-60">{o.status}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const ChatPanel = ()=>{
    const [text, setText] = useState('');
    return (
      <div className="p-3 bg-slate-900 rounded flex flex-col gap-2" style={{maxHeight:300}}>
        <div className="flex items-center gap-2"><MessageSquare/><div className="text-sm font-semibold">Chat</div></div>
        <div className="overflow-auto flex-1" style={{maxHeight:180}}>
          {chatMessages.map(m=> (
            <div key={m.id} className="mb-2">
              <div className="text-xs opacity-70">{m.user} • {m.id===1 ? '' : ''}</div>
              <div className="text-sm">{m.text}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 p-2 rounded bg-slate-800" placeholder="Say something..."/>
          <button onClick={()=>{ if(text.trim()){ sendChat(text); setText(''); }}} className="p-2 rounded bg-blue-600">Send</button>
        </div>
      </div>
    );
  };

  const LiveFeed = ()=> (
    <div className="p-3 bg-slate-900 rounded overflow-auto" style={{maxHeight:220}}>
      <div className="text-sm font-semibold mb-2">Live Feed</div>
      <ul className="space-y-1 text-xs">
        {feed.map((f,i)=> (
          <li key={i} className="flex justify-between"><span className="opacity-80">{f.text}</span><span className="opacity-50">{f.time}</span></li>
        ))}
      </ul>
    </div>
  );

  const BinaryDigits = ()=> (
    <div className="p-3 bg-slate-800 rounded">
      <div className="text-sm font-semibold mb-2">Binary Digits (0-9)</div>
      <div className="grid grid-cols-5 gap-2">
        {binaryDigits.map(d=> (
          <div key={d} className="p-3 bg-white/5 rounded text-center font-mono">{d}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <Header />
        <main className="grid grid-cols-12 gap-4">
          <section className="col-span-8 space-y-4">
            <PriceChart />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><TradePanel /></div>
              <div className="col-span-1"><BinaryDigits /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><OrdersView /></div>
              <div className="col-span-1"><LiveFeed /></div>
            </div>
          </section>

          <aside className="col-span-4 space-y-4">
            <ChatPanel />
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-sm font-semibold mb-2">Quick Actions</div>
              <div className="flex gap-2">
                <button onClick={()=>{ setBalance(b=>b+100); setFeed(f=>[{type:'system', text:'Deposited $100 (demo)', time: new Date().toLocaleTimeString()}, ...f].slice(0,50)); }} className="flex-1 p-2 rounded bg-yellow-500">Deposit $100</button>
                <button onClick={()=>{ setBalance(1000); setOrders([]); setFeed(f=>[{type:'system', text:'Reset demo state', time: new Date().toLocaleTimeString()}, ...f].slice(0,50)); }} className="flex-1 p-2 rounded bg-slate-700">Reset</button>
              </div>
              <div className="mt-3 text-xs opacity-70">API Token: <span className="font-mono">{apiToken ? '***hidden***' : 'not set'}</span></div>
            </div>
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-sm font-semibold mb-2">Market Tools</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>{ setBinaryDigits(b=>b.map(x=>Math.floor(Math.random()*10))); }} className="p-2 rounded bg-slate-700">Shuffle Digits</button>
                <button onClick={()=>{ setFeed(f=>[{type:'system', text:'Indicator triggered (mock)', time: new Date().toLocaleTimeString()}, ...f].slice(0,50)); }} className="p-2 rounded bg-slate-700">Run Indicator</button>
              </div>
            </div>
          </aside>
        </main>

        <footer className="text-xs text-center opacity-60">Demo trading UI — not for real money. Replace mock feeds & handlers with your broker's API for real trading.</footer>
      </div>
    </div>
  );
}
