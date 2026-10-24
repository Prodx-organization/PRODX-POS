import React, { useState } from 'react';
import { useDndMonitor, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { HardwarePeripheralStatus } from '../../types/hardware';

interface DraggablePeripheralProps {
  peripheral: HardwarePeripheralStatus;
}

const DraggablePeripheral: React.FC<DraggablePeripheralProps> = ({ peripheral }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: peripheral.id,
    data: { peripheral },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <g ref={setNodeRef as unknown as React.Ref<SVGGElement>} style={style} {...listeners} {...attributes} className="cursor-grab">
      <circle r="15" fill="#6366f1" />
      <text x="20" y="5" className="text-xs font-bold fill-text">{peripheral.name}</text>
    </g>
  );
};

interface FloorPlanViewProps {
  peripherals: HardwarePeripheralStatus[];
  onUpdatePosition: (id: string, position: { x: number, y: number }) => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ peripherals, onUpdatePosition }) => {
  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-6 w-full h-[600px] overflow-hidden">
      <h2 className="text-lg font-bold mb-4 text-text">Store Floor Plan</h2>
      <svg className="w-full h-full bg-background border border-border rounded-xl">
        {peripherals.map((p) => (
          <DraggablePeripheral key={p.id} peripheral={p} />
        ))}
      </svg>
    </div>
  );
};
