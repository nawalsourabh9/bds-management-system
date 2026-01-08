import { useState } from 'react';
import { toast } from 'sonner';

export const useTaskDocumentUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const processTaskDocuments = async (taskId: string, documents: any[]) => {
    setIsUploading(true);
    try {
      console.log("Processing document uploads for task:", taskId, documents);
      
      // Upload documents via FastAPI
      const formData = new FormData();
      documents.forEach((doc, index) => {
        if (doc.file) {
          formData.append(`files`, doc.file);
        }
      });
      formData.append('task_id', taskId);
      
      const response = await fetch('/api/v1/tasks/upload-documents', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }
      
      const result = await response.json();
      console.log("Documents uploaded successfully:", result);
      
      toast.success('Documents uploaded successfully');
      return result;
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    processTaskDocuments,
    isUploading,
  };
};