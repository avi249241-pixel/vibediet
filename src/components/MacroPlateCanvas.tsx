import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ComponentFoodItem } from '../types/diet';
import { ATWATER_PROTEIN_FACTOR, ATWATER_CARB_FACTOR, ATWATER_FAT_FACTOR } from '../utils/atwater';

interface MacroPlateCanvasProps {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  totalCalories: number;
  components?: ComponentFoodItem[];
  size?: number;
  interactive?: boolean;
}

interface SliceData {
  name: string;
  grams: number;
  calories: number;
  color: string;
  glowColor: string;
  percentage: number;
  startAngle: number;
  endAngle: number;
}

export const MacroPlateCanvas: React.FC<MacroPlateCanvasProps> = ({
  proteinGrams,
  carbsGrams,
  fatGrams,
  fiberGrams = 0,
  totalCalories,
  size = 280,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<SliceData | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Compute macro distribution
  const slices: SliceData[] = useMemo(() => {
    const proteinKcal = Math.max(0, proteinGrams * ATWATER_PROTEIN_FACTOR);
    const carbsKcal = Math.max(0, carbsGrams * ATWATER_CARB_FACTOR);
    const fatKcal = Math.max(0, fatGrams * ATWATER_FAT_FACTOR);
    const sumKcal = proteinKcal + carbsKcal + fatKcal || 1;

    const rawSlices = [
      {
        name: 'Protein',
        grams: Math.round(proteinGrams * 10) / 10,
        calories: Math.round(proteinKcal),
        color: '#3b82f6', // blue-500
        glowColor: 'rgba(59, 130, 246, 0.4)',
        fraction: proteinKcal / sumKcal,
      },
      {
        name: 'Carbohydrates',
        grams: Math.round(carbsGrams * 10) / 10,
        calories: Math.round(carbsKcal),
        color: '#f59e0b', // amber-500
        glowColor: 'rgba(245, 158, 11, 0.4)',
        fraction: carbsKcal / sumKcal,
      },
      {
        name: 'Dietary Fat',
        grams: Math.round(fatGrams * 10) / 10,
        calories: Math.round(fatKcal),
        color: '#f43f5e', // rose-500
        glowColor: 'rgba(244, 63, 94, 0.4)',
        fraction: fatKcal / sumKcal,
      },
    ];

    let currentAngle = -Math.PI / 2;
    return rawSlices.map(s => {
      const sliceAngle = s.fraction * (Math.PI * 2);
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      return {
        name: s.name,
        grams: s.grams,
        calories: s.calories,
        color: s.color,
        glowColor: s.glowColor,
        percentage: Math.round(s.fraction * 100),
        startAngle,
        endAngle,
      };
    });
  }, [proteinGrams, carbsGrams, fatGrams]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const plateRadius = size * 0.46;
    const innerRimRadius = size * 0.42;
    const outerRingRadius = size * 0.38;
    const innerRingRadius = size * 0.23;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw Ceramic Slate Outer Plate
    const plateGrad = ctx.createRadialGradient(
      centerX - plateRadius * 0.3,
      centerY - plateRadius * 0.3,
      10,
      centerX,
      centerY,
      plateRadius
    );
    plateGrad.addColorStop(0, '#1e293b'); // slate-800
    plateGrad.addColorStop(0.7, '#0f172a'); // slate-900
    plateGrad.addColorStop(1, '#020617'); // slate-950

    ctx.beginPath();
    ctx.arc(centerX, centerY, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = plateGrad;
    ctx.fill();

    // Subtle Plate Rim Bevel
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // 2. Inner ceramic plate groove
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRimRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Draw Macro Slices
    const hasData = slices.some(s => s.calories > 0);

    if (!hasData) {
      // Empty placeholder plate ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, (outerRingRadius + innerRingRadius) / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = outerRingRadius - innerRingRadius;
      ctx.stroke();
    } else {
      slices.forEach((slice) => {
        if (slice.endAngle - slice.startAngle <= 0.001) return;

        const isHovered = hoveredSlice?.name === slice.name;
        const currentOuter = isHovered ? outerRingRadius + 4 : outerRingRadius;
        const currentInner = isHovered ? innerRingRadius - 2 : innerRingRadius;

        ctx.save();
        if (isHovered) {
          ctx.shadowColor = slice.color;
          ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, currentOuter, slice.startAngle, slice.endAngle, false);
        ctx.arc(centerX, centerY, currentInner, slice.endAngle, slice.startAngle, true);
        ctx.closePath();

        ctx.fillStyle = slice.color;
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.restore();
      });
    }

    // 4. Center Plate Core Display
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRingRadius - 3, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // 5. Center Text (Kcal & Indicator)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px "Syne", sans-serif';
    ctx.fillText(`${totalCalories}`, centerX, centerY - 6);

    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CALORIES', centerX, centerY + 13);
  }, [slices, totalCalories, size, hoveredSlice]);

  // Position checker utility
  const checkSliceAtCoords = (clientX: number, clientY: number) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setMousePos({ x: clientX, y: clientY });

    const centerX = size / 2;
    const centerY = size / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const outerRingRadius = size * 0.40;
    const innerRingRadius = size * 0.21;

    if (dist >= innerRingRadius && dist <= outerRingRadius) {
      let angle = Math.atan2(dy, dx);
      // Normalize angle to [-PI/2, 3PI/2] to match startAngle (-PI/2)
      if (angle < -Math.PI / 2) {
        angle += Math.PI * 2;
      }

      const match = slices.find(s => {
        let start = s.startAngle;
        let end = s.endAngle;
        return angle >= start && angle <= end;
      });

      setHoveredSlice(match || null);
    } else {
      setHoveredSlice(null);
    }
  };

  // Mouse interaction handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    checkSliceAtCoords(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      checkSliceAtCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseLeave = () => {
    setHoveredSlice(null);
    setMousePos(null);
  };

  return (
    <div className="relative inline-flex flex-col items-center select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
        className="cursor-pointer transition-transform duration-200 touch-none"
      />

      {/* Floating slice tooltip */}
      {hoveredSlice && (
        <div
          className="absolute -top-10 px-2.5 py-1 rounded bg-slate-900/95 border border-slate-700/80 text-xs shadow-xl backdrop-blur-md pointer-events-none transition-all flex items-center gap-2"
          style={{
            borderColor: hoveredSlice.color,
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredSlice.color }} />
          <span className="font-semibold text-slate-100">{hoveredSlice.name}:</span>
          <span className="text-slate-300 font-mono tabular-nums">{hoveredSlice.grams}g</span>
          <span className="text-slate-400">({hoveredSlice.percentage}%)</span>
        </div>
      )}

      {/* Legend Under Plate */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span className="text-slate-300">Protein</span>
          <span className="text-slate-400 font-mono tabular-nums text-[11px]">{proteinGrams}g</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-slate-300">Carbs</span>
          <span className="text-slate-400 font-mono tabular-nums text-[11px]">{carbsGrams}g</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span className="text-slate-300">Fat</span>
          <span className="text-slate-400 font-mono tabular-nums text-[11px]">{fatGrams}g</span>
        </div>
      </div>
    </div>
  );
};
