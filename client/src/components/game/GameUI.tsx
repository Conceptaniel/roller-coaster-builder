import { useState, useRef } from "react";
import { useRollerCoaster } from "@/lib/stores/useRollerCoaster";
import { Button } from "@/components/ui/button";

export function GameUI() {
  const {
    mode,
    trackPoints,
    startRide,
    stopRide,
    clearTrack,
    rideProgress,
    selectedPointId,
    removeTrackPoint,
    rideSpeed,
    setRideSpeed,
    isAddingPoints,
    setIsAddingPoints,
    isLooped,
    setIsLooped,
    hasChainLift,
    setHasChainLift,
    showWoodSupports,
    setShowWoodSupports,
    isNightMode,
    setIsNightMode,
    createLoopAtPoint,
    setCameraTarget,
    savedCoasters,
    currentCoasterName,
    saveCoaster,
    loadCoaster,
    deleteCoaster,
    exportCoaster,
    importCoaster,
  } = useRollerCoaster();
  
  const [position, setPosition] = useState({ x: 8, y: 8 });
  const [isDragging, setIsDragging] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleSave = () => {
    if (saveName.trim()) {
      saveCoaster(saveName.trim());
      setSaveName("");
      setShowSaveDialog(false);
    }
  };
  
  const handleExport = (id: string) => {
    const json = exportCoaster(id);
    if (json) {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const coaster = savedCoasters.find(c => c.id === id);
      a.download = `${coaster?.name || "coaster"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (importCoaster(text)) {
          alert("Coaster imported successfully!");
        } else {
          alert("Failed to import coaster. Invalid file format.");
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const loadPreset = (presetName: string) => {
    const presets: { [key: string]: string } = {
      yukon: JSON.stringify({
        id: "preset-yukon-striker",
        name: "Yukon Striker",
        timestamp: Date.now(),
        trackPoints: [
          // STATION (South End)
          { id: "p0", position: [0, 3, 0], tilt: 0 },
          
          // STATION TO LIFT TRANSITION - Smooth ramp-up
          { id: "p0a", position: [0.08, 3.3, 0.08], tilt: -0.15 },
          { id: "p0b", position: [0.18, 4.2, 0.18], tilt: -0.35 },
          { id: "p0c", position: [0.32, 5.5, 0.32], tilt: -0.55 },
          
          // LIFT HILL - 45° ascent going north, 223 ft
          { id: "p1", position: [0.5, 8, 0.5], tilt: -0.785 },
          { id: "p2", position: [1, 15, 1], tilt: -0.785 },
          { id: "p3", position: [1.5, 22, 1.5], tilt: -0.785 },
          { id: "p4", position: [2, 29, 2], tilt: -0.785 },
          { id: "p5", position: [2.5, 36, 2.5], tilt: -0.785 },
          { id: "p6", position: [3, 43, 3], tilt: -0.785 },
          { id: "p7", position: [3.5, 50, 3.5], tilt: -0.785 },
          
          // BRAKE PLATFORM - Horizontal at crest (223 ft)
          { id: "p8", position: [4, 54, 4], tilt: 0 },
          { id: "p9", position: [5, 54, 4], tilt: 0 },
          
          // VERTICAL DROP - 90° into tunnel (245 ft down)
          { id: "p10", position: [6, 52, 4], tilt: -1.57 },
          { id: "p11", position: [6, 44, 4], tilt: -1.57 },
          { id: "p12", position: [6, 36, 4], tilt: -1.57 },
          { id: "p13", position: [6, 28, 4], tilt: -1.57 },
          { id: "p14", position: [6, 20, 4], tilt: -1.57 },
          { id: "p15", position: [6, 12, 4], tilt: -1.57 },
          { id: "p16", position: [6, 6, 4], tilt: -1.57 },
          { id: "p17", position: [6, 3, 4], tilt: -1.2 },
          
          // EXIT TUNNEL - Curve pull-out
          { id: "p18", position: [7, 2, 4], tilt: -0.9 },
          { id: "p19", position: [8, 2, 4], tilt: -0.7 },
          { id: "p20", position: [9, 3, 4], tilt: -0.4 },
          
          // DIVE LOOP - Leftward bank into upward half-loop
          { id: "p21", position: [10, 6, 5], tilt: -0.5 },
          { id: "p22", position: [11, 12, 8], tilt: -0.6 },
          { id: "p23", position: [12, 18, 12], tilt: -0.7 },
          { id: "p24", position: [13, 22, 14], tilt: -0.8 },
          { id: "p25", position: [14, 20, 14], tilt: -0.7 },
          { id: "p26", position: [15, 12, 12], tilt: -0.4 },
          { id: "p27", position: [16, 6, 8], tilt: 0 },
          { id: "p28", position: [17, 4, 4], tilt: 0.2 },
          
          // IMMELMANN - Large sweeping half-loop with twist
          { id: "p29", position: [18, 5, 2], tilt: -0.3 },
          { id: "p30", position: [19, 10, 1], tilt: -0.4 },
          { id: "p31", position: [20, 18, 2], tilt: -0.5 },
          { id: "p32", position: [21, 26, 6], tilt: -0.6 },
          { id: "p33", position: [22, 30, 12], tilt: -0.7 },
          { id: "p34", position: [23, 28, 16], tilt: -0.6 },
          { id: "p35", position: [24, 20, 16], tilt: -0.3 },
          { id: "p36", position: [25, 12, 12], tilt: 0 },
          { id: "p37", position: [26, 6, 6], tilt: 0.3 },
          
          // ZERO-G WINDER - Rising roll with twist
          { id: "p38", position: [27, 4, 2], tilt: 0.4 },
          { id: "p39", position: [28, 6, 0], tilt: 0.5 },
          { id: "p40", position: [29, 12, 2], tilt: 0.6 },
          { id: "p41", position: [30, 20, 8], tilt: 0.7 },
          { id: "p42", position: [31, 26, 14], tilt: 0.6 },
          { id: "p43", position: [32, 24, 18], tilt: 0.3 },
          { id: "p44", position: [33, 16, 16], tilt: -0.1 },
          { id: "p45", position: [34, 8, 10], tilt: -0.3 },
          
          // HELIX - Tight 360° turn with high banking (>80°)
          { id: "p46", position: [35, 4, 4], tilt: -0.4 },
          { id: "p47", position: [36, 3, 0], tilt: -0.5 },
          { id: "p48", position: [37, 4, -4], tilt: -0.7 },
          { id: "p49", position: [36, 8, -6], tilt: -0.9 },
          { id: "p50", position: [34, 10, -4], tilt: -1.0 },
          { id: "p51", position: [32, 8, 0], tilt: -0.8 },
          { id: "p52", position: [31, 5, 4], tilt: -0.5 },
          { id: "p53", position: [30, 4, 6], tilt: -0.2 },
          
          // FINAL BRAKE RUN - Elevated return heading back south with brake pads
          { id: "p54", position: [28, 4, 8], tilt: 0 },
          { id: "p55", position: [24, 4.5, 10], tilt: 0 },
          { id: "p56", position: [20, 5, 10], tilt: 0 },
          { id: "p57", position: [16, 5, 8], tilt: 0 },
          { id: "p58", position: [12, 5, 6], tilt: 0 },
          
          // BRAKE RUN SECTION 2 - Final approach to station with magnetic brakes
          { id: "p59", position: [8, 4.5, 4], tilt: 0 },
          { id: "p60", position: [4, 4, 2], tilt: 0 },
          { id: "p61", position: [2, 3.5, 1], tilt: 0 },
          
          // RETURN TO STATION - Complete loop
          { id: "p62", position: [0, 3, 0], tilt: 0 }
        ],
        loopSegments: [
          // DIVE LOOP
          {
            id: "dive-loop",
            entryPointId: "p21",
            radius: 6,
            pitch: 12
          },
          // IMMELMANN
          {
            id: "immelmann",
            entryPointId: "p29",
            radius: 7,
            pitch: 13
          },
          // ZERO-G WINDER
          {
            id: "zero-g-winder",
            entryPointId: "p38",
            radius: 6,
            pitch: 11
          }
        ],
        isLooped: true,
        hasChainLift: true,
        showWoodSupports: false
      }),
      kingda: JSON.stringify({
        id: "preset-kingda-ka",
        name: "Kingda Ka",
        timestamp: Date.now(),
        trackPoints: [
          { id: "p0", position: [0, 5, 0], tilt: 0 },
          { id: "p1", position: [3, 15, 2], tilt: -0.3 },
          { id: "p2", position: [6, 30, 4], tilt: -0.45 },
          { id: "p3", position: [9, 45, 6], tilt: -0.6 },
          { id: "p4", position: [10, 56, 8], tilt: -0.7 },
          { id: "p5", position: [11, 60, 10], tilt: -0.75 },
          { id: "p6", position: [12, 50, 12], tilt: 0.5 },
          { id: "p7", position: [15, 35, 15], tilt: 0.3 },
          { id: "p8", position: [20, 20, 18], tilt: 0.1 },
          { id: "p9", position: [25, 10, 20], tilt: -0.1 },
          { id: "p10", position: [30, 5, 18], tilt: 0 },
          { id: "p11", position: [35, 8, 12], tilt: 0.2 },
          { id: "p12", position: [40, 12, 5], tilt: 0 },
          { id: "p13", position: [42, 5, 2], tilt: -0.1 }
        ],
        loopSegments: [],
        isLooped: false,
        hasChainLift: true,
        showWoodSupports: false
      }),
      steelvengeance: JSON.stringify({
        id: "preset-steel-vengeance",
        name: "Steel Vengeance",
        timestamp: Date.now(),
        trackPoints: [
          { id: "p0", position: [0, 4, 0], tilt: 0 },
          { id: "p1", position: [5, 12, 3], tilt: -0.2 },
          { id: "p2", position: [10, 22, 7], tilt: -0.4 },
          { id: "p3", position: [15, 32, 12], tilt: -0.5 },
          { id: "p4", position: [20, 38, 18], tilt: -0.45 },
          { id: "p5", position: [25, 40, 24], tilt: 0.3 },
          { id: "p6", position: [30, 35, 28], tilt: 0.5 },
          { id: "p7", position: [35, 25, 26], tilt: 0.3 },
          { id: "p8", position: [40, 18, 22], tilt: 0.2 },
          { id: "p9", position: [45, 12, 16], tilt: -0.2 },
          { id: "p10", position: [50, 10, 8], tilt: -0.3 },
          { id: "p11", position: [55, 15, 0], tilt: 0.1 },
          { id: "p12", position: [60, 22, -8], tilt: 0.2 },
          { id: "p13", position: [65, 28, -14], tilt: 0 },
          { id: "p14", position: [70, 20, -18], tilt: -0.2 },
          { id: "p15", position: [75, 10, -16], tilt: -0.1 },
          { id: "p16", position: [80, 5, -8], tilt: 0 },
          { id: "p17", position: [82, 3, 0], tilt: 0.1 }
        ],
        loopSegments: [
          {
            id: "loop1",
            entryPointId: "p3",
            radius: 4,
            pitch: 10
          },
          {
            id: "loop2",
            entryPointId: "p8",
            radius: 4,
            pitch: 10
          }
        ],
        isLooped: true,
        hasChainLift: true,
        showWoodSupports: false
      })
    };
    
    const preset = presets[presetName];
    if (preset) {
      importCoaster(preset);
      setShowPresetsDialog(false);
    }
  };
  
  const canRide = trackPoints.length >= 2;
  
  return (
    <div 
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="absolute pointer-events-auto bg-black/80 p-2 rounded-lg text-white text-xs cursor-move select-none"
        style={{ left: position.x, top: position.y, maxWidth: '180px' }}
        onMouseDown={handleMouseDown}
      >
        <h1 className="text-sm font-bold mb-1">Coaster Builder</h1>
        
        {mode === "build" && (
          <>
            <p className="text-gray-400 mb-1 text-[10px]">
              Pts: {trackPoints.length} | Drag menu to move
            </p>
            
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => setIsAddingPoints(!isAddingPoints)}
                className={`h-6 text-[10px] px-2 ${isAddingPoints 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-gray-600 hover:bg-gray-700"}`}
              >
                {isAddingPoints ? "Add Pts ON" : "Add Pts OFF"}
              </Button>
              
              <Button
                size="sm"
                onClick={() => setIsLooped(!isLooped)}
                disabled={trackPoints.length < 3}
                className={`h-6 text-[10px] px-2 ${isLooped 
                  ? "bg-purple-600 hover:bg-purple-700" 
                  : "bg-gray-600 hover:bg-gray-700"}`}
              >
                {isLooped ? "Loop ON" : "Loop OFF"}
              </Button>
              
              <Button
                size="sm"
                onClick={() => setHasChainLift(!hasChainLift)}
                className={`h-6 text-[10px] px-2 ${hasChainLift 
                  ? "bg-yellow-600 hover:bg-yellow-700" 
                  : "bg-gray-600 hover:bg-gray-700"}`}
              >
                {hasChainLift ? "Chain ON" : "Chain OFF"}
              </Button>
              
              <Button
                size="sm"
                onClick={() => setShowWoodSupports(!showWoodSupports)}
                disabled={trackPoints.length < 2}
                className={`h-6 text-[10px] px-2 ${showWoodSupports 
                  ? "bg-amber-700 hover:bg-amber-800" 
                  : "bg-gray-600 hover:bg-gray-700"}`}
              >
                {showWoodSupports ? "Wood ON" : "Wood OFF"}
              </Button>
              
              <Button
                size="sm"
                onClick={() => setIsNightMode(!isNightMode)}
                className={`h-6 text-[10px] px-2 ${isNightMode 
                  ? "bg-indigo-700 hover:bg-indigo-800" 
                  : "bg-gray-600 hover:bg-gray-700"}`}
              >
                {isNightMode ? "Night ON" : "Night OFF"}
              </Button>
              
              <Button
                size="sm"
                onClick={startRide}
                disabled={!canRide}
                className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700"
              >
                Ride
              </Button>
              
              <Button
                size="sm"
                onClick={clearTrack}
                variant="destructive"
                disabled={trackPoints.length === 0}
                className="h-6 text-[10px] px-2"
              >
                Clear
              </Button>
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={trackPoints.length < 2}
                  className="h-6 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 flex-1"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowLoadDialog(true)}
                  className="h-6 text-[10px] px-2 bg-slate-600 hover:bg-slate-700 flex-1"
                >
                  Load
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowPresetsDialog(true)}
                  className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700 flex-1"
                >
                  Presets
                </Button>
              </div>
              
              {selectedPointId && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      const point = trackPoints.find(p => p.id === selectedPointId);
                      if (point) setCameraTarget(point.position.clone());
                    }}
                    className="h-6 text-[10px] px-2 bg-cyan-600 hover:bg-cyan-700"
                  >
                    Focus
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => createLoopAtPoint(selectedPointId)}
                    className="h-6 text-[10px] px-2 bg-pink-600 hover:bg-pink-700"
                  >
                    Add Loop
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => removeTrackPoint(selectedPointId)}
                    variant="outline"
                    className="h-6 text-[10px] px-2 border-red-500 text-red-500 hover:bg-red-500/20"
                  >
                    Delete Pt
                  </Button>
                </>
              )}
            </div>
            
            <div className="mt-2">
              <label className="text-[10px] text-gray-400 block">
                Speed: {rideSpeed.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.25"
                value={rideSpeed}
                onChange={(e) => setRideSpeed(parseFloat(e.target.value))}
                className="w-full h-2"
              />
            </div>
          </>
        )}
        
        {mode === "ride" && (
          <>
            <div className="mb-2">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${rideProgress * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {Math.round(rideProgress * 100)}%
              </p>
            </div>
            
            <Button
              size="sm"
              onClick={stopRide}
              variant="outline"
              className="h-6 text-[10px] px-2 border-white text-white hover:bg-white/20 w-full"
            >
              Exit
            </Button>
          </>
        )}
        
        {currentCoasterName && (
          <p className="text-[10px] text-gray-500 mt-1 truncate">
            {currentCoasterName}
          </p>
        )}
      </div>
      
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveDialog(false)} />
          <div className="relative bg-gray-900 p-4 rounded-lg text-white max-w-xs w-full mx-4">
            <h2 className="text-sm font-bold mb-2">Save Coaster</h2>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter coaster name..."
              className="w-full p-2 rounded bg-gray-800 text-white text-sm mb-2"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1 bg-teal-600 hover:bg-teal-700">
                Save
              </Button>
              <Button size="sm" onClick={() => setShowSaveDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLoadDialog(false)} />
          <div className="relative bg-gray-900 p-4 rounded-lg text-white max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-sm font-bold mb-2">Saved Coasters</h2>
            
            {savedCoasters.length === 0 ? (
              <p className="text-gray-400 text-xs mb-2">No saved coasters yet.</p>
            ) : (
              <div className="space-y-2 mb-2">
                {savedCoasters.map((coaster) => (
                  <div key={coaster.id} className="bg-gray-800 p-2 rounded text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium truncate">{coaster.name}</span>
                      <span className="text-gray-500 text-[10px]">
                        {new Date(coaster.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => { loadCoaster(coaster.id); setShowLoadDialog(false); }}
                        className="h-5 text-[10px] px-2 bg-green-600 hover:bg-green-700 flex-1"
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExport(coaster.id)}
                        className="h-5 text-[10px] px-2 bg-blue-600 hover:bg-blue-700"
                      >
                        Export
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteCoaster(coaster.id)}
                        variant="destructive"
                        className="h-5 text-[10px] px-2"
                      >
                        Del
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-t border-gray-700 pt-2 mt-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-6 text-[10px] bg-orange-600 hover:bg-orange-700 mb-2"
              >
                Import from File
              </Button>
              <Button
                size="sm"
                onClick={() => setShowLoadDialog(false)}
                variant="outline"
                className="w-full h-6 text-[10px]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Presets Dialog */}
      {showPresetsDialog && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPresetsDialog(false)} />
          <div className="relative bg-gray-900 p-4 rounded-lg text-white max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-sm font-bold mb-3">Coaster Presets</h2>
            
            <div className="space-y-2 mb-3">
              <Button
                size="sm"
                onClick={() => loadPreset("yukon")}
                className="w-full h-8 text-[11px] bg-indigo-600 hover:bg-indigo-700 font-medium"
              >
                🎢 Yukon Striker
              </Button>
              <Button
                size="sm"
                onClick={() => loadPreset("kingda")}
                className="w-full h-8 text-[11px] bg-red-600 hover:bg-red-700 font-medium"
              >
                🏔️ Kingda Ka
              </Button>
              <Button
                size="sm"
                onClick={() => loadPreset("steelvengeance")}
                className="w-full h-8 text-[11px] bg-orange-600 hover:bg-orange-700 font-medium"
              >
                ⚡ Steel Vengeance
              </Button>
            </div>
            
            <Button
              size="sm"
              onClick={() => setShowPresetsDialog(false)}
              variant="outline"
              className="w-full h-6 text-[10px]"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
