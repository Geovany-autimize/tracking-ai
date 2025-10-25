import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText } from 'lucide-react';
import { MessageTemplate } from '@/types/templates';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TemplatesListProps {
  templates: MessageTemplate[];
  selectedId?: string;
  onSelect: (template: MessageTemplate) => void;
  onNew: () => void;
}

export function TemplatesList({
  templates,
  selectedId,
  onSelect,
  onNew,
}: TemplatesListProps) {
  const [search, setSearch] = useState('');

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Templates</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onNew} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhum template encontrado' : 'Nenhum template criado'}
            </p>
            {!search && (
              <Button
                variant="link"
                onClick={onNew}
                className="mt-2"
              >
                Criar primeiro template
              </Button>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                selectedId === template.id && 'border-primary bg-primary/5'
              )}
              onClick={() => onSelect(template)}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-1">
                    {template.name}
                  </h4>
                  <Badge
                    variant={template.is_active ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {template.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {template.notification_type.length} gatilho
                  {template.notification_type.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
