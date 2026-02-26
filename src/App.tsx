/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Grid3X3, 
  ArrowRight, 
  RotateCcw, 
  Maximize2, 
  Info,
  Settings2,
  Layers
} from 'lucide-react';
import { 
  computeSVD, 
  reconstructMatrix, 
  Matrix2x2, 
  SVDResult,
  getAngle,
  fromAngle
} from './utils/matrix';

// --- Components ---

const RotationSlider = ({ 
  angle, 
  onChange, 
  label, 
  color = "purple" 
}: { 
  angle: number; 
  onChange: (val: number) => void; 
  label: string;
  color?: string;
}) => {
  const deg = (angle * 180) / Math.PI;
  
  const colorClasses: Record<string, string> = {
    purple: "accent-purple-500",
    amber: "accent-amber-500",
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">{deg.toFixed(0)}°</span>
      </div>
      <input 
        type="range" 
        min="-180" 
        max="180" 
        step="1"
        value={deg}
        onChange={(e) => onChange((parseFloat(e.target.value) * Math.PI) / 180)}
        className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
      />
    </div>
  );
};

const MatrixDisplay = ({ 
  value, 
  label, 
  color = "blue" 
}: { 
  value: Matrix2x2; 
  label: string;
  color?: string;
}) => {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-500/20",
    purple: "border-purple-500/20",
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl border bg-zinc-900/20 transition-all ${colorClasses[color]}`}>
        {value.map((row, i) => 
          row.map((val, j) => (
            <div
              key={`${i}-${j}`}
              className="w-full text-center font-mono text-sm text-zinc-400 py-1"
            >
              {val.toFixed(4)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const MatrixInput = ({ 
  value, 
  onChange, 
  label, 
  color = "blue" 
}: { 
  value: Matrix2x2; 
  onChange: (val: Matrix2x2) => void; 
  label: string;
  color?: string;
}) => {
  const handleChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = [...value.map(r => [...r])] as Matrix2x2;
    next[row][col] = num;
    onChange(next);
  };

  const colorClasses: Record<string, string> = {
    blue: "border-blue-500/30 focus-within:border-blue-500",
    purple: "border-purple-500/30 focus-within:border-purple-500",
    emerald: "border-emerald-500/30 focus-within:border-emerald-500",
    amber: "border-amber-500/30 focus-within:border-amber-500",
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl border-2 bg-zinc-900/50 transition-all ${colorClasses[color]}`}>
        {value.map((row, i) => 
          row.map((val, j) => (
            <input
              key={`${i}-${j}`}
              type="number"
              step="0.0001"
              value={val.toFixed(4)}
              onChange={(e) => handleChange(i, j, e.target.value)}
              className="w-full bg-transparent text-center font-mono text-lg focus:outline-none text-zinc-200"
            />
          ))
        )}
      </div>
    </div>
  );
};

const SigmaInput = ({ 
  value, 
  onChange 
}: { 
  value: [number, number]; 
  onChange: (val: [number, number]) => void; 
}) => {
  const adjust = (idx: number, delta: number) => {
    const next = [...value] as [number, number];
    next[idx] = Math.max(0, Math.min(5, Math.round((next[idx] + delta) * 10) / 10));
    onChange(next);
  };

  const handleInput = (idx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = [...value] as [number, number];
    next[idx] = Math.max(0, Math.min(5, num));
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Σ (Scaling [0-5])</span>
      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border-2 border-emerald-500/30 bg-zinc-900/50 focus-within:border-emerald-500 transition-all">
        <div className="flex flex-col items-center">
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={value[0].toFixed(1)}
            onChange={(e) => handleInput(0, e.target.value)}
            className="w-full bg-transparent text-center font-mono text-lg focus:outline-none text-zinc-200"
          />
          <div className="flex gap-1 mt-1">
            <button onClick={() => adjust(0, -0.1)} className="px-2 bg-zinc-800 rounded text-xs hover:bg-zinc-700">-</button>
            <button onClick={() => adjust(0, 0.1)} className="px-2 bg-zinc-800 rounded text-xs hover:bg-zinc-700">+</button>
          </div>
        </div>
        <div className="w-full text-center font-mono text-lg text-zinc-600">0.0000</div>
        <div className="w-full text-center font-mono text-lg text-zinc-600">0.0000</div>
        <div className="flex flex-col items-center">
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={value[1].toFixed(1)}
            onChange={(e) => handleInput(1, e.target.value)}
            className="w-full bg-transparent text-center font-mono text-lg focus:outline-none text-zinc-200"
          />
          <div className="flex gap-1 mt-1">
            <button onClick={() => adjust(1, -0.1)} className="px-2 bg-zinc-800 rounded text-xs hover:bg-zinc-700">-</button>
            <button onClick={() => adjust(1, 0.1)} className="px-2 bg-zinc-800 rounded text-xs hover:bg-zinc-700">+</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransformStage = ({ 
  matrix, 
  label, 
  subLabel,
  points,
  color = "#3b82f6"
}: { 
  matrix: Matrix2x2; 
  label: string; 
  subLabel: string;
  points: [number, number][];
  color?: string;
}) => {
  const size = 200;
  const padding = 40;
  const scale = (size - padding * 2) / 4; // Scale factor for visualization

  const transformedPoints = useMemo(() => {
    return points.map(([x, y]) => {
      const tx = matrix[0][0] * x + matrix[0][1] * y;
      const ty = matrix[1][0] * x + matrix[1][1] * y;
      return [tx, ty];
    });
  }, [matrix, points]);

  // Group points into polygons for the 'F' shape
  const polygons = [
    transformedPoints.slice(0, 4), // Vertical bar
    transformedPoints.slice(4, 8), // Top bar
    transformedPoints.slice(8, 12) // Middle bar
  ];

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-100">{label}</h3>
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-tighter">{subLabel}</p>
      </div>
      
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Grid lines */}
          <g stroke="#27272a" strokeWidth="0.5">
            {[-2, -1, 0, 1, 2].map(i => (
              <React.Fragment key={i}>
                <line x1={0} y1={size/2 + i * scale} x2={size} y2={size/2 + i * scale} />
                <line x1={size/2 + i * scale} y1={0} x2={size/2 + i * scale} y2={size} />
              </React.Fragment>
            ))}
          </g>
          
          {/* Axes */}
          <line x1={0} y1={size/2} x2={size} y2={size/2} stroke="#3f3f46" strokeWidth="1" />
          <line x1={size/2} y1={0} x2={size/2} y2={size} stroke="#3f3f46" strokeWidth="1" />

          {/* Transformed Shape */}
          <g transform={`translate(${size/2}, ${size/2}) scale(1, -1)`}>
            {/* Unit Circle for reference */}
            <circle cx="0" cy="0" r={scale} fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
            
            {polygons.map((poly, i) => (
              <path
                key={i}
                d={`M ${poly[0][0] * scale} ${poly[0][1] * scale} 
                   ${poly.slice(1).map(p => `L ${p[0] * scale} ${p[1] * scale}`).join(' ')} Z`}
                fill={`${color}30`}
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                className="transition-all duration-700 ease-in-out"
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // Main Source of Truth: Matrix A
  const [matrixA, setMatrixA] = useState<Matrix2x2>([[1.5, 0.5], [0.5, 1.5]]);
  
  // SVD Components state to avoid "jumps" during decomposition
  const [svd, setSvd] = useState<SVDResult>(() => computeSVD([[1.5, 0.5], [0.5, 1.5]]));

  // Derived Angles from the current SVD state
  const angleU = useMemo(() => getAngle(svd.u), [svd.u]);
  const angleVT = useMemo(() => getAngle(svd.vt), [svd.vt]);

  // Handlers
  const handleAChange = (newA: Matrix2x2) => {
    setMatrixA(newA);
    // When A changes, we MUST re-decompose to update the right side
    setSvd(computeSVD(newA));
  };

  const handleAngleUChange = (newAngle: number) => {
    const newU = fromAngle(newAngle);
    const newSvd = { ...svd, u: newU };
    setSvd(newSvd);
    // Update A based on the new SVD components (no re-decomposition loop)
    setMatrixA(reconstructMatrix(newU, svd.s, svd.vt));
  };

  const handleAngleVTChange = (newAngle: number) => {
    const newVT = fromAngle(newAngle);
    const newSvd = { ...svd, vt: newVT };
    setSvd(newSvd);
    // Update A based on the new SVD components (no re-decomposition loop)
    setMatrixA(reconstructMatrix(svd.u, svd.s, newVT));
  };

  const handleSigmaChange = (newS: [number, number]) => {
    const newSvd = { ...svd, s: newS };
    setSvd(newSvd);
    // Update A based on the new SVD components (no re-decomposition loop)
    setMatrixA(reconstructMatrix(svd.u, newS, svd.vt));
  };

  // Visualization points: an 'F' shape for clarity
  const points: [number, number][] = [
    // Vertical bar
    [-0.5, -1], [-0.5, 1], [0, 1], [0, -1],
    // Top horizontal bar
    [0, 0.7], [0.8, 0.7], [0.8, 1], [0, 1],
    // Middle horizontal bar
    [0, 0], [0.5, 0], [0.5, 0.3], [0, 0.3]
  ];

  // Intermediate matrices for stages
  const stage1 = [[1, 0], [0, 1]] as Matrix2x2; // Original
  const stage2 = svd.vt; // After V^T (Rotation)
  const stage3 = reconstructMatrix([[1, 0], [0, 1]], svd.s, svd.vt); // After S * V^T (Scaling)
  const stage4 = matrixA; // After U * S * V^T (Rotation)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Layers className="w-6 h-6 text-blue-500" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">SVD Visualizer</h1>
            </div>
            <p className="text-zinc-500 max-w-2xl">
              Singular Value Decomposition decomposes any matrix <span className="font-mono text-zinc-300">A</span> into 
              <span className="font-mono text-zinc-300"> U Σ Vᵀ</span>. 
              Physically, this represents a rotation, a scaling, and another rotation.
            </p>
          </div>
          
          <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <RotateCcw className="w-3 h-3" /> Rotation (Vᵀ)
            </span>
            <span className="w-px h-3 bg-zinc-800" />
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Maximize2 className="w-3 h-3" /> Scaling (Σ)
            </span>
            <span className="w-px h-3 bg-zinc-800" />
            <span className="flex items-center gap-1.5 text-zinc-400">
              <RotateCcw className="w-3 h-3" /> Rotation (U)
            </span>
          </div>
        </header>

        {/* Control Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Matrix A */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Original Transformation</h2>
            </div>
            <MatrixInput 
              label="Matrix A" 
              value={matrixA} 
              onChange={handleAChange} 
              color="blue"
            />
            <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 text-sm italic text-zinc-500">
              Modify the values above to see how the decomposition updates in real-time.
            </div>
          </div>

          {/* Middle: Arrow */}
          <div className="hidden lg:flex lg:col-span-1 h-full items-center justify-center">
            <ArrowRight className="w-8 h-8 text-zinc-800" />
          </div>

          {/* Right: SVD Components */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-2 mb-2">
              <Grid3X3 className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">SVD Decomposition</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <RotationSlider 
                  label="U Angle" 
                  angle={angleU} 
                  onChange={handleAngleUChange} 
                  color="purple"
                />
                <MatrixDisplay label="U Matrix" value={svd.u} color="purple" />
              </div>

              <div className="space-y-4">
                <SigmaInput 
                  value={svd.s} 
                  onChange={handleSigmaChange} 
                />
                <div className="p-3 rounded-xl border border-emerald-500/10 bg-zinc-900/20 text-center font-mono text-xs text-zinc-500">
                  Scaling Factors
                </div>
              </div>

              <div className="space-y-4">
                <RotationSlider 
                  label="Vᵀ Angle" 
                  angle={angleVT} 
                  onChange={handleAngleVTChange} 
                  color="amber"
                />
                <MatrixDisplay label="Vᵀ Matrix" value={svd.vt} color="amber" />
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-xs text-emerald-500/80">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                U and Vᵀ are now controlled via rotation angles to ensure they remain orthogonal. 
                Modifying the original matrix A will automatically update these angles.
              </p>
            </div>
          </div>
        </section>

        {/* Visualization Section */}
        <section className="space-y-8 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              Transformation Pipeline
            </h2>
            <div className="text-xs font-mono text-zinc-500">
              Order: x → Vᵀx → ΣVᵀx → UΣVᵀx
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <TransformStage 
              matrix={stage1} 
              label="Original" 
              subLabel="Identity Matrix"
              points={points}
              color="#71717a"
            />
            <TransformStage 
              matrix={stage2} 
              label="Step 1: Rotate" 
              subLabel="Apply Vᵀ"
              points={points}
              color="#f59e0b"
            />
            <TransformStage 
              matrix={stage3} 
              label="Step 2: Scale" 
              subLabel="Apply Σ"
              points={points}
              color="#10b981"
            />
            <TransformStage 
              matrix={stage4} 
              label="Step 3: Rotate" 
              subLabel="Apply U"
              points={points}
              color="#8b5cf6"
            />
          </div>
        </section>

        {/* Footer Info */}
        <footer className="pt-12 border-t border-zinc-800 text-center text-zinc-600 text-sm">
          <p>Built for Matrix Theory Demonstration • 2026</p>
        </footer>
      </div>
    </div>
  );
}
