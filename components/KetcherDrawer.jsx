"use client";
import React, { useEffect, useState } from 'react';
import 'ketcher-react/dist/index.css';

// Ketcher requires these to be dynamically imported because they rely on window/DOM
let StandaloneStructServiceProvider;
let Editor;

export default function KetcherDrawer({ onSaveSmiles }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [provider, setProvider] = useState(null);
  const [ketcherInstance, setKetcherInstance] = useState(null);

  useEffect(() => {
    // Dynamically import Ketcher libraries only on the client side
    import('ketcher-standalone').then((standalone) => {
      StandaloneStructServiceProvider = standalone.StandaloneStructServiceProvider;
      setProvider(new StandaloneStructServiceProvider());
      import('ketcher-react').then((react) => {
        Editor = react.Editor;
        setIsLoaded(true);
      });
    });
  }, []);

  if (!isLoaded || !provider) {
    return <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-900 border border-slate-700 rounded">Loading Molecular Drawer...</div>;
  }

  const handleSave = async () => {
    if (ketcherInstance) {
      try {
        const smiles = await ketcherInstance.getSmiles();
        onSaveSmiles(smiles);
      } catch (error) {
        console.error('Failed to get SMILES from Ketcher', error);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-white">
      <div className="flex-1 overflow-hidden relative">
        <Editor
          staticResourcesUrl={""}
          structServiceProvider={provider}
          onInit={(ketcher) => setKetcherInstance(ketcher)}
        />
      </div>
      <div className="bg-slate-800 p-2 border-t border-slate-700 flex justify-end gap-2">
        <button 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-semibold text-sm transition-colors"
        >
          Generate from Drawing
        </button>
      </div>
    </div>
  );
}
