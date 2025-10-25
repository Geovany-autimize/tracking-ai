import { useState } from 'react';
import PageHeader from '@/components/app/PageHeader';
import { TemplatesList } from '@/components/templates/TemplatesList';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { WhatsAppPreview } from '@/components/templates/WhatsAppPreview';
import { useTemplates } from '@/hooks/use-templates';
import { MessageTemplate } from '@/types/templates';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default function Templates() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState('');
  const isMobile = useIsMobile();

  const handleNew = () => {
    setSelectedTemplate(null);
    setIsNew(true);
    setMessage('');
  };

  const handleSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsNew(false);
    setMessage(template.message_content);
  };

  const handleCancel = () => {
    setSelectedTemplate(null);
    setIsNew(false);
    setMessage('');
  };

  const handleSave = (template: Omit<MessageTemplate, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => {
    createTemplate(template);
    handleCancel();
  };

  const handleUpdate = (template: Partial<MessageTemplate> & { id: string }) => {
    updateTemplate(template);
    handleCancel();
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    handleCancel();
  };

  if (isMobile) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <PageHeader
          title="Templates de Mensagens"
          description="Crie e gerencie templates de mensagens WhatsApp para seus clientes"
        />

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Templates</TabsTrigger>
            <TabsTrigger value="editor" disabled={!selectedTemplate && !isNew}>
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!message}>
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <TemplatesList
              templates={templates}
              selectedId={selectedTemplate?.id}
              onSelect={handleSelect}
              onNew={handleNew}
            />
          </TabsContent>

          <TabsContent value="editor" className="mt-4">
            <TemplateEditor
              template={isNew ? null : selectedTemplate}
              onSave={handleSave}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onCancel={handleCancel}
              onMessageChange={setMessage}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <WhatsAppPreview message={message} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        title="Templates de Mensagens"
        description="Crie e gerencie templates de mensagens WhatsApp para seus clientes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)]">
        {/* Templates List - Left Sidebar */}
        <div className="lg:col-span-3">
          <TemplatesList
            templates={templates}
            selectedId={selectedTemplate?.id}
            onSelect={handleSelect}
            onNew={handleNew}
          />
        </div>

        {/* Editor - Center */}
        <div className="lg:col-span-5">
          <TemplateEditor
            template={isNew ? null : selectedTemplate}
            onSave={handleSave}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onCancel={handleCancel}
            onMessageChange={setMessage}
          />
        </div>

        {/* Preview - Right Sidebar (Desktop only) */}
        <div className="hidden xl:block lg:col-span-4">
          <WhatsAppPreview message={message} />
        </div>

        {/* Preview Button for Tablet */}
        <div className="xl:hidden lg:col-span-4 flex items-start">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Ver Preview
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <WhatsAppPreview message={message} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
