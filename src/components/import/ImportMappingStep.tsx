import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';

interface ImportMappingStepProps {
  csvHeaders: string[];
  requiredFields: { id: string; label: string; required: boolean }[];
  onNext: (mapping: Record<string, string>) => void;
  onBack: () => void;
}

function DraggableHeader({ header, disabled = false }: { header: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: header,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...attributes}
      className={`p-3 bg-accent rounded-md border transition-colors ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-move hover:bg-accent/80'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {header}
    </div>
  );
}

function DroppableField({ 
  field, 
  mappedHeader,
  onClear
}: { 
  field: { id: string; label: string; required: boolean }; 
  mappedHeader: string | null;
  onClear?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: field.id,
  });

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        className={`p-4 border-2 border-dashed rounded-md min-h-[60px] flex items-center justify-between transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-border'
        } ${field.required ? 'border-orange-500/50' : ''}`}
      >
        <div>
          <div className="font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </div>
          {mappedHeader && (
            <div className="text-sm text-muted-foreground mt-1">← {mappedHeader}</div>
          )}
        </div>
      </div>
      {mappedHeader && onClear && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function ImportMappingStep({
  csvHeaders,
  requiredFields,
  onNext,
  onBack,
}: ImportMappingStepProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const autoDetectMapping = () => {
    const newMapping: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      const matchingHeader = csvHeaders.find(
        header => 
          header.toLowerCase().replace(/[_\s]/g, '') === 
          field.id.toLowerCase().replace(/[_\s]/g, '')
      );
      
      if (matchingHeader) {
        newMapping[matchingHeader] = field.id;
      }
    });
    
    setMapping(newMapping);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const csvHeader = active.id as string;
    const fieldId = over.id as string;

    setMapping(prev => {
      const newMapping = { ...prev };
      
      // Remove previous mapping of this CSV header
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === fieldId) {
          delete newMapping[key];
        }
      });
      
      newMapping[csvHeader] = fieldId;
      return newMapping;
    });
  };

  const handleClearMapping = (fieldId: string) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      const headerToRemove = Object.keys(newMapping).find(
        key => newMapping[key] === fieldId
      );
      if (headerToRemove) {
        delete newMapping[headerToRemove];
      }
      return newMapping;
    });
  };

  const isValid = requiredFields
    .filter(f => f.required)
    .every(f => Object.values(mapping).includes(f.id));

  useEffect(() => {
    autoDetectMapping();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mapear Colunas</h3>
          <p className="text-sm text-muted-foreground">
            Arraste as colunas do CSV para os campos correspondentes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={autoDetectMapping} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Auto-detectar
        </Button>
      </div>

      <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setActiveId(e.active.id as string)}>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium mb-3">Colunas do CSV</h4>
            <div className="space-y-2">
              {csvHeaders.map(header => {
                const isMapped = !!mapping[header];
                return (
                  <div key={header} className="relative">
                    <DraggableHeader 
                      header={header} 
                      disabled={isMapped}
                    />
                    {isMapped && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-2 -right-2 text-xs"
                      >
                        Mapeado
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Campos do Sistema</h4>
            <div className="space-y-2">
              {requiredFields.map(field => (
                <DroppableField
                  key={field.id}
                  field={field}
                  mappedHeader={
                    Object.keys(mapping).find(k => mapping[k] === field.id) || null
                  }
                  onClear={() => handleClearMapping(field.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <Card className="p-3 bg-accent shadow-lg cursor-move">
              {activeId}
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!isValid && (
        <div className="text-sm text-destructive">
          * Todos os campos obrigatórios devem ser mapeados
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={() => onNext(mapping)} disabled={!isValid} className="gap-2">
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
