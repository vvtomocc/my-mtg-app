'use client';
//npm run dev
//http://localhost:3000
import { useState, useMemo } from 'react';
import { PDFDocument,degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export default function MtgDeckGenerator() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    deckName: '',
    mainBoard: '4 意志の力/Force of Will\n4 渦まく知識/Brainstorm',
    sideBoard: '2 紅蓮破/Pyroblast',
  });

  // --- 合計枚数を計算するロジック ---
  const calculateTotal = (text: string) => {
    const lines = text.split('\n');
    return lines.reduce((acc, line) => {
      const match = line.match(/^(\d+)/); // 行頭の数字を探す
      return acc + (match ? parseInt(match[1], 10) : 0);
    }, 0);
  };

  const mainCount = useMemo(() => calculateTotal(formData.mainBoard), [formData.mainBoard]);
  const sideCount = useMemo(() => calculateTotal(formData.sideBoard), [formData.sideBoard]);

  const handleScreenClick = (e: React.MouseEvent) => {
    const x = Math.round((e.clientX / window.innerWidth) * 600);
    const y = Math.round((1 - e.clientY / window.innerHeight) * 800);
    setCoords({ x, y });
  };

  const generatePdf = async () => {
    setIsProcessing(true);
    try {
      const pdfBytes = await fetch('/template.pdf').then(res => res.arrayBuffer());
      const fontBytes = await fetch('/fonts/NotoSansJP-VariableFont_wght.ttf').then(res => res.arrayBuffer());

      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);
      const jpFont = await pdfDoc.embedFont(fontBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // --- 1. 名前（左下・縦書き・下から上） ---
      // 座標は付近を想定。クリックして微調整してください。
      // --- 1. 名前（左下・縦書き・下から上） ---
firstPage.drawText(formData.lastName, { 
  x: 54, 
  y: 120, 
  size: 15, 
  font: jpFont, 
  rotate: degrees(90) // ← ここを書き換え
});

firstPage.drawText(formData.firstName, { 
  x: 54, 
  y: 350, 
  size: 15, 
  font: jpFont, 
  rotate: degrees(90) // ← ここを書き換え
});

      // --- 2. 基本情報（右上の表付近 ） ---
      firstPage.drawText(formData.deckName, { x: 430, y: 705, size: 10, font: jpFont });

      // --- 3. メインデッキの印字 (31行目から2列目に移動) ---
      const mainLines = formData.mainBoard.split('\n');
      mainLines.forEach((line, index) => {
        // 基本は1列目の座標
        let xCount = 90;
        let xName = 135;
        let yPos = 605 - (index * 17.9); 

        // 31行目以降（index 30以上）は2列目の座標へ切り替え
        if (index >= 30) {
          const col2Index = index - 30; // 2列目の中での行番号
          xCount = 362; // 指定の2列目枚数X
          xName = 405; // 指定の2列目カード名X
          yPos = 605 - (col2Index * 17.9); // 2列目も上から並べる
        }
        
        const match = line.match(/^(\d+)\s+(.*)/);
        
        if (match) {
          const count = match[1];
          const name = match[2];
          
          firstPage.drawText(count, { x: xCount, y: yPos, size: 12, font: jpFont });
          firstPage.drawText(name, { x: xName, y: yPos, size: 12, font: jpFont });
        } else if (line.trim()) {
          firstPage.drawText(line, { x: xName, y: yPos, size: 12, font: jpFont });
        }
      });
      // メイン合計枚数印字 
      firstPage.drawText(mainCount.toString(), { x: 275, y: 41, size: 18, font: jpFont });

      // --- 4. サイドボードの印字 (枚数と名前を分けて配置) ---
      const sideLines = formData.sideBoard.split('\n');
      sideLines.forEach((line, index) => {
        // サイドボードの開始位置。枠に合わせて 315 を微調整してください
        const yPos = 372 - (index * 17.9); 
        
        // 正規表現で「最初の数字」と「それ以降の文字」に分解
        const match = line.match(/^(\d+)\s+(.*)/);
        
        if (match) {
          const count = match[1]; // 枚数 (例: "2")
          const name = match[2];  // カード名 (例: "紅蓮破/Pyroblast")
          
          // 枚数を印字 (サイドボード枠の枚数列 )
          // 座標 x: 395 は目安です。クリックして微調整してください
          firstPage.drawText(count, { x: 362, y: yPos, size: 12, font: jpFont });
          
          // カード名を印字 (サイドボード枠のカード名列 )
          firstPage.drawText(name, { x: 405, y: yPos, size: 12, font: jpFont });
        } else if (line.trim()) {
          // 数字がない行はカード名列の開始位置に印字
          firstPage.drawText(line, { x: 405, y: yPos, size: 12, font: jpFont });
        }
      });
      // サイド合計枚数印字 
      firstPage.drawText(sideCount.toString(), { x: 540, y: 93, size: 18, font: jpFont });

      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decklist_${formData.lastName}.pdf`;
      link.click();
    } catch (error) {
      alert('エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4" onClick={handleScreenClick}>
     

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-blue-400 font-bold">基本情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="名字" className="bg-slate-800 p-2 rounded" onChange={(e)=>setFormData({...formData, lastName:e.target.value})}/>
            <input placeholder="名前" className="bg-slate-800 p-2 rounded" onChange={(e)=>setFormData({...formData, firstName:e.target.value})}/>
          </div>
          <input placeholder="デッキ名" className="w-full bg-slate-800 p-2 rounded" onChange={(e)=>setFormData({...formData, deckName:e.target.value})}/>
          
          <button onClick={(e)=>{e.stopPropagation(); generatePdf();}} className="w-full bg-blue-600 py-4 rounded-lg font-bold hover:bg-blue-500">
            PDFを生成 (Main:{mainCount} / Side:{sideCount})
          </button>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between border-b border-slate-700 pb-2">
            <h2 className="text-purple-400 font-bold">メインデッキ ({mainCount}枚)</h2>
            <span className={mainCount < 60 ? "text-red-400" : "text-green-400"}>
              {mainCount < 60 ? "※60枚以上必要です" : "OK"}
            </span>
          </div>
          <textarea className="w-full h-48 bg-slate-800 p-2 rounded font-mono text-sm" value={formData.mainBoard} onChange={(e)=>setFormData({...formData, mainBoard:e.target.value})}/>
          
          <div className="flex justify-between border-b border-slate-700 pb-2 pt-4">
            <h2 className="text-purple-400 font-bold">サイドボード ({sideCount}枚)</h2>
            <span className={sideCount > 15 ? "text-red-400" : "text-green-400"}>
              {sideCount > 15 ? "※15枚以内です" : "OK"}
            </span>
          </div>
          <textarea className="w-full h-24 bg-slate-800 p-2 rounded font-mono text-sm" value={formData.sideBoard} onChange={(e)=>setFormData({...formData, sideBoard:e.target.value})}/>
        </div>
      </div>
    </main>
  );
}